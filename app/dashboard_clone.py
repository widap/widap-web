# -*- encoding: utf-8 -*-

# This dashboard is intended to be pretty much a clone of the previous version
# done using a Jupyter notebook.

import config
import dash
import dash_core_components as dcc
import dash_html_components as html
import mysql.connector
import pandas as pd
import plotly.graph_objs as go
import random
from dash.dependencies import Input, Output, State
from dash.exceptions import PreventUpdate
from flask_caching import Cache

ONE_HOUR_IN_SEC = 3600

KG_PER_LB = 0.45359237
KG_PER_TON = 2000 * KG_PER_LB
WH_PER_BTU = 0.29307107

MONTHLY_GEN_BOXPLOT_TITLE = 'Monthly box plot of gross generation'
EMISSIONS_TIME_SERIES_TITLE = 'Emissions time series'
EI_SCATTER_TITLE = 'Emissions intensity vs. capacity factor'

app = dash.Dash(__name__)
cache = Cache(app.server, config={
  # TODO: Consider a non-filesystem cache
  'CACHE_TYPE': 'filesystem',
  'CACHE_DEFAULT_TIMEOUT': ONE_HOUR_IN_SEC,
  'CACHE_DIR': '.flask-cache',
})

app.index_string = '''
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>WIDAP Dashboard</title>
        {%favicon%}
        {%css%}
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
        </footer>
    </body>
</html>
'''

cfg = config.getcfg()
conn = mysql.connector.connect(
  host=cfg["host"],
  database=cfg["database"],
  user=cfg["user"],
  password=cfg["password"])

plants_units = pd.read_csv("plants_units.csv") \
  .groupby("orispl_code") \
  .agg({"name": "last", "unitid": lambda x: tuple(x)}) \
  .to_dict(orient='index')

app.layout = html.Div([
  dcc.Store(id='datastore'),

  html.H1('WIDAP Dashboard'),

  html.Div([
    'Plant:',
    dcc.Dropdown(
      id='plant-dropdown',
      options=[{'label': plant["name"], 'value': orispl_code}
               for orispl_code, plant in plants_units.items()],
      value='',
      placeholder='Select a plant...',
      clearable=False),
    'Unit:',
    dcc.Dropdown(id='unit-id-dropdown', placeholder='Select a unit...'),
    html.Button(id='load-data-button', children='Load'),
  ],
  id='plant-unit-selector',
  className='plot-selector'),

  html.H2(MONTHLY_GEN_BOXPLOT_TITLE, id='boxplot-header'),
  dcc.Graph(id='monthly-generation-boxplot', config={'displaylogo': False}),

  html.H2(EMISSIONS_TIME_SERIES_TITLE, id='emissions-time-series-header'),
  dcc.Graph(id='emissions-time-series', config={'displaylogo': False}),

  html.H2(EI_SCATTER_TITLE, id='ei-scatter-header'),
  dcc.Graph(id='co2-intensity-vs-cf', config={'displaylogo': False}),
  # Add emissions intensity for SO2 as well

  # 4. Histograms
  # (a) Efficiency := generation / heat_input
  dcc.Graph(id='efficiency-histogram', config={'displaylogo': False}),
  # (b) Capacity factor (i) vs heat_input (ii) vs generation
  # (c) Emissions intensity histogram for (i-iv) CO2e, CO2, SO2, NOx
])

@cache.memoize()
def read_sql_data(orispl_code, unit_id):
  query_fmt = '' \
      + 'SELECT adddate(op_date, interval op_hour hour) as datetime, ' \
      + 'gload * op_time as gen, ' \
      + 'so2_mass, ' \
      + 'nox_mass, ' \
      + 'co2_mass, ' \
      + 'heat_input ' \
      + 'FROM data ' \
      + 'WHERE orispl_code = {} AND unitid = \"{}\" ' \
      + 'LIMIT 200000'
  query_text = query_fmt.format(orispl_code, unit_id)
  # TODO: Reading data from AWS copy of MySQL DB is taking ~5s on every call.
  # This really ought to be improved; we're only reading <150k rows.
  df = pd.read_sql(query_text, conn)
  # Oddly, the data is not guaranteed to be sorted by datetime beforehand :/
  df.index = df['datetime']
  df.drop(['datetime'], axis=1, inplace=True)
  df.sort_index(inplace=True)
  # TODO: Come up with a good compression scheme. I think we know enough about
  # the structure/constraints on the data to strongly limit the amount of
  # space we need to store it.
  return df.fillna(0.0).to_json(orient='split', date_unit='s')

def load_data_from_json(df_json):
  return pd.read_json(df_json, orient='split', date_unit='s')

def compute_co2e(co2_mass, nox_mass):
  """Computes CO2e given CO2 and NOx."""
  return KG_PER_TON * co2_mass + 298 * KG_PER_LB * nox_mass

def header_updater(text):
  """Returns a callback used to update a header."""
  def make_header(unused_figure, orispl_code, unit_id):
    plant_name = plants_units[orispl_code]['name']
    return '{} - {}, Unit {}'.format(text, plant_name, unit_id)
  return make_header

def jitter(series, max_jitter):
  return series.map(lambda x: x + (max_jitter * (random.random() - 0.5)))

@app.callback(
    Output('unit-id-dropdown', 'options'),
    [Input('plant-dropdown', 'value')])
def set_unit_id_options(selected_plant):
  if selected_plant in plants_units:
    unitids = plants_units[selected_plant]["unitid"]
    return [{'label': x, 'value': x} for x in unitids]
  return ''

@app.callback(
    Output('unit-id-dropdown', 'value'),
    [Input('plant-dropdown', 'value')])
def clear_unit_id_value(unused_plant):
  return ''

@app.callback(
    Output('datastore', 'data'),
    [Input('load-data-button', 'n_clicks')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def load_plant_unit_data(n_clicks, orispl_code, unit_id):
  if n_clicks is None:
    raise PreventUpdate
  if orispl_code and unit_id:
    return read_sql_data(orispl_code, unit_id)
  return ''

@app.callback(
  Output('monthly-generation-boxplot', 'figure'),
  [Input('datastore', 'data')])
def update_monthly_generation_boxplot(df_json):
  df = load_data_from_json(df_json)
  boxes = []
  for ts, monthly_gen in df.gen.groupby(pd.Grouper(freq='M')):
    boxes.append(go.Box(
      y=monthly_gen,
      name='{}-{:02d}'.format(ts.year, ts.month),
      showlegend=False,
      boxpoints=False,
      marker = {'color': 'rgb(9,56,125)'},
      line = {'color': 'rgb(9,56,125)'},
    ))
  return {
    'data': boxes,
    'layout': go.Layout(
      xaxis={
        'title': 'Date',
        'type': 'date',
      },
      yaxis={
        'fixedrange': True,
        'title': 'Gross Generation (MWh)',
      },
      margin={'l': 50, 'b': 40, 't': 10, 'r': 10},
    ),
  }

app.callback(
    Output('boxplot-header', 'children'),
    [Input('monthly-generation-boxplot', 'figure')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')]
)(header_updater(MONTHLY_GEN_BOXPLOT_TITLE))

@app.callback(
    Output('emissions-time-series', 'figure'),
    [Input('datastore', 'data')])
def update_emissions_time_series(df_json):
  df = load_data_from_json(df_json)
  return {
    'data': [go.Scattergl(
      x=df.index,
      y=df['co2_mass'],
      text='CO<sub>2</sub> mass (tons)',
    )],
    'layout': go.Layout(
      xaxis={
        'title': 'Date',
        'type': 'date',
        'rangeslider': {
          'visible': True,
        },
      },
      yaxis={
        'title': 'CO<sub>2</sub> mass (tons)',
      },
      margin={'l': 50, 'b': 40, 't': 10, 'r': 10},
    ),
  }

app.callback(
    Output('emissions-time-series-header', 'children'),
    [Input('emissions-time-series', 'figure')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')],
)(header_updater(EMISSIONS_TIME_SERIES_TITLE))

@app.callback(
    Output('co2-intensity-vs-cf', 'figure'),
    [Input('datastore', 'data')])
def update_co2_intensity_vs_cf_scatterplot(df_json):
  raw = load_data_from_json(df_json)
  raw['cf'] = raw.gen / raw.gen.max()
  df = raw[raw.cf > 0.02] # TODO: Determine if this is a sane threshold
  co2_ei = KG_PER_TON * df.co2_mass / df.gen
  return {
    # TODO: Consider adding a Histogram2d overlay
    'data': [go.Scattergl(
      x=jitter(df.cf, 0.005),
      y=co2_ei,
      text=df.index,
      mode='markers',
      marker={'size': 1.5})],
    'layout': go.Layout(
      xaxis={'title': 'Capacity Factor'},
      yaxis={
        'title': 'CO<sub>2</sub> Intensity (kg/MWh)',
        'range': [0, 2.0 * co2_ei.median()],
      },
      margin={'l': 60, 'b': 40, 't': 10, 'r': 10},
    ),
  }

app.callback(
    Output('ei-scatter-header', 'children'),
    [Input('co2-intensity-vs-cf', 'figure')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')],
)(header_updater(EI_SCATTER_TITLE))

@app.callback(
    Output('efficiency-histogram', 'figure'),
    [Input('datastore', 'data')])
def update_efficiency_histogram(df_json):
  df = load_data_from_json(df_json)
  return {
    'data': [go.Histogram(
      # Don't divide by 0!
      x=df.gen / (df.heat_input * WH_PER_BTU),
      xbins={'start': 0.0, 'end': 1.0},
      text='Efficiency',
    )],
    'layout': go.Layout(
      xaxis={'title': 'Efficiency (generation / heat input)'},
      yaxis={'title': 'Counts', 'fixedrange': True},
      margin={'l': 60, 'b': 40, 't': 10, 'r': 10},
    ),
  }


if __name__ == '__main__':
  # In production, this won't be invoked directly.
  app.run_server(debug=True)
