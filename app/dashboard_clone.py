# -*- encoding: utf-8 -*-

# This dashboard is intended to be pretty much a clone of the previous version
# done using a Jupyter notebook.

import time
import config
import dash
import dash_core_components as dcc
import dash_html_components as html
import mysql.connector
import pandas as pd
import plotly.graph_objs as go
from dash.dependencies import Input, Output, State
from dash.exceptions import PreventUpdate
from flask_caching import Cache

ONE_HOUR_IN_SEC = 3600

KG_PER_LB = 0.45359237
KG_PER_TON = 2000 * KG_PER_LB
WH_PER_BTU = 0.29307107

app = dash.Dash(__name__)
cache = Cache(app.server, config={
  # TODO: Definitely use something more robust than a Python dict cache! Other
  # prominent options: Filesystem, Redis, etc.
  'CACHE_TYPE': 'simple',
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
    dcc.Dropdown(
      id='unit-id-dropdown',
      placeholder='Select a unit...'),
    html.Button(
      id='load-data-button',
      children='Load'),
  ],
  id='plant-unit-selector',
  className='plot-selector'),

  # 1. Monthly generation boxplot
  # dcc.Graph(id='monthly-generation-boxplot', config={'displaylogo': False}),

  # 2. Emissions time series
  dcc.Graph(id='emissions-time-series', config={'displaylogo': False}),

  # 3. Scatter plot of emissions intensity (y) vs CF (x) for (a) CO2 (b) SO2
  dcc.Graph(id='co2-intensity-vs-cf', config={'displaylogo': False}),

  # 4. Histograms
  # (a) Efficiency := generation / heat_input
  dcc.Graph(id='efficiency-histogram', config={'displaylogo': False}),
  # (b) Capacity factor (i) vs heat_input (ii) vs generation
  # (c) Emissions intensity histogram for (i-iv) CO2e, CO2, SO2, NOx
])

@cache.memoize(timeout=ONE_HOUR_IN_SEC)
def read_sql_data(orispl_code, unit_id):
  query_text = '''
      SELECT adddate(op_date, interval op_hour hour) as datetime,
          gload * op_time as gen,
          so2_mass,
          nox_mass,
          co2_mass,
          heat_input
      FROM data
      WHERE orispl_code = {} AND unitid = "{}"
      LIMIT 200000
  '''.format(orispl_code, unit_id)
  # TODO: Come up with a good compression scheme. I think we know enough about
  # the structure/constraints on the data to strongly limit the amount of
  # space we need to store it.
  start = time.time()
  df = pd.read_sql(query_text, conn)
  end = time.time()
  print("Loaded data from SQL in {} s.".format(end - start))
  start = time.time()
  s = df.to_json(orient='split', date_unit='s', index=False)
  end = time.time()
  print("Serialized DataFrame to JSON in {} s.".format(end - start))
  return s

def compute_co2e(co2_mass, nox_mass):
  """Compute CO2e given CO2 and NOx."""
  return KG_PER_TON * co2_mass + 298 * KG_PER_LB * nox_mass

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

@app.callback(Output('datastore', 'data'),
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
  Output('emissions-time-series', 'figure'),
  [Input('datastore', 'data')])
def update_emissions_time_series(df_json):
  start = time.time()
  df = pd.read_json(df_json, orient='split', date_unit='s').fillna(0.0)
  end = time.time()
  print("Read json in {} s.".format(end - start))
  return {
    'data': [go.Scattergl(
      x=df['datetime'],
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
        'title': 'CO2 mass (tons)',
      },
      margin={'l': 50, 'b': 40, 't': 10, 'r': 10},
    ),
  }

@app.callback(
  Output('co2-intensity-vs-cf', 'figure'),
  [Input('datastore', 'data')])
def update_co2_intensity_vs_cf_histogram(df_json):
  dff = pd.read_json(df_json, orient='split', date_unit='s').fillna(0.0)
  df = dff[dff.gen > 5]
  max_gen = df['gen'].max()
  return {
    'data': [go.Scattergl(
      x=df['gen'] / max_gen,
      y=KG_PER_TON * df['co2_mass'] / df['gen'],
      text=df['datetime'],
      mode='markers',
    )],
    'layout': go.Layout(
      xaxis={
        'title': 'Capacity Factor',
      },
      yaxis={
        'title': 'CO2 Intensity (kg/MWh)',
      },
      margin={'l': 50, 'b': 40, 't': 10, 'r': 10},
    ),
  }

@app.callback(
  Output('efficiency-histogram', 'figure'),
  [Input('datastore', 'data')])
def update_efficiency_histogram(df_json):
  df = pd.read_json(df_json, orient='split', date_unit='s').fillna(0.0)
  return {
    'data': [go.Histogram(
      # Don't divide by 0!
      x=(df['gen']) / (df['heat_input'] * WH_PER_BTU),
      xbins={
        'start': 0.0,
        'end': 1.0,
      },
      text='Efficiency',
    )],
    'layout': go.Layout(
      xaxis={
        'title': 'Efficiency (generation / heat input)',
      },
      yaxis={
        'title': 'Counts',
        'fixedrange': True,
      },
      margin={'l': 50, 'b': 40, 't': 10, 'r': 10},
    ),
  }


if __name__ == '__main__':
  # In production, this won't be invoked directly.
  app.run_server(debug=True)