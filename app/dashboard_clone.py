# -*- encoding: utf-8 -*-

# This dashboard is intended to be pretty much a clone of the previous version
# done using a Jupyter notebook.

import config
import copy
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

STD_MARGIN = {'l': 60, 'b': 40, 't': 40, 'r': 20}
STD_FONT_FAMILY = "'Source Sans Pro', 'Open Sans', sans-serif"
STD_FONT = {'family': STD_FONT_FAMILY}

GEN_BOXPLOT_LAYOUT = go.Layout(
  title={'text': 'Monthly gross generation box plot'},
  xaxis={'title': 'Date', 'type': 'date', 'tickformat': '%b %Y'},
  yaxis={'fixedrange': True, 'title': 'Gross Generation (MWh)'},
  font=STD_FONT,
  margin=STD_MARGIN,
)

EMISSIONS_TIME_SERIES_LAYOUT = go.Layout(
  title={'text': 'Emissions time series'},
  showlegend=False,
  grid={'yaxes': ['y', 'y2', 'y3'], 'rows': 3, 'columns': 1},
  xaxis={'title': 'Date', 'type': 'date'},
  yaxis={'title': {'text': 'SO<sub>2</sub> (lbs/hr)'}, 'fixedrange': True},
  yaxis2={'title': {'text': 'NO<sub>x</sub> (lbs/hr)'}, 'fixedrange': True},
  yaxis3={'title': {'text': 'CO<sub>2</sub> (tons/hr)'}, 'fixedrange': True},
  font=STD_FONT,
  margin=STD_MARGIN,
)

EMISSIONS_INTENSITY_LAYOUT = go.Layout(
  title={'text': 'Emissions intensity vs capacity factor (CO<sub>2</sub> and SO<sub>2</sub>)'},
  showlegend=False,
  grid={'rows': 1, 'columns': 2, 'pattern': 'independent'},
  xaxis={'title': 'Capacity Factor'},
  xaxis2={'title': 'Capacity Factor'},
  yaxis={'title': 'CO<sub>2</sub> Intensity (kg/MWh)'},
  yaxis2={'title': 'SO<sub>2</sub> Intensity (lbs/MWh)'},
  font=STD_FONT,
  margin=STD_MARGIN,
)

EFFICIENCY_HISTOGRAM_LAYOUT = go.Layout(
  title={'text': 'Histogram of observed efficiency values'},
  xaxis={'title': 'Efficiency (generation / heat input)'},
  yaxis={'title': 'Counts', 'fixedrange': True},
  font=STD_FONT,
  margin=STD_MARGIN,
)

CAPACITY_FACTOR_HISTOGRAM_LAYOUT = go.Layout(
  title={'text': 'Capacity factor histogram'},
  showlegend=False,
  grid={'rows': 1, 'columns': 2, 'pattern': 'independent'},
  xaxis={'title': 'Capacity factor from heat input'},
  xaxis2={'title': 'Capacity factor from generation'},
  yaxis={'title': 'Counts', 'fixedrange': True},
  yaxis2={'title': 'Counts', 'fixedrange': True},
  font=STD_FONT,
  margin=STD_MARGIN,
)

app = dash.Dash(__name__)
cache = Cache(app.server, config={
  # TODO: Consider a non-filesystem cache
  'CACHE_TYPE': 'filesystem',
  'CACHE_DEFAULT_TIMEOUT': ONE_HOUR_IN_SEC,
  'CACHE_DIR': '.flask-cache',
})

def load_plants_units(plants_units_file):
  df = pd.read_csv(plants_units_file, index_col='orispl_code')
  df.unit_ids = df.unit_ids.str.split("/")
  return df.to_dict(orient='index')

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
  # Oddly, the data is not guaranteed to be sorted by datetime beforehand :/
  df = pd.read_sql(query_text, conn, index_col='datetime').sort_index()
  # TODO: Come up with a good compression scheme. I think we know enough about
  # the structure/constraints on the data to strongly limit the amount of
  # space we need to store it.
  return df.to_json(orient='split', date_unit='s')

def load_data_from_json(df_json):
  return pd.read_json(df_json, orient='split', date_unit='s')

def compute_co2e(co2_mass, nox_mass):
  """Computes CO2e given CO2 and NOx."""
  return KG_PER_TON * co2_mass + 298 * KG_PER_LB * nox_mass

def jitter(series, max_jitter):
  return series.map(lambda x: x + (max_jitter * (random.random() - 0.5)))

def graph_component(html_id, layout):
  return dcc.Graph(
    id=html_id,
    figure={'data': [], 'layout': layout},
    config={'displaylogo': False})

def titled_layout(layout, orispl_code, unit_id):
  layout_copy = copy.copy(layout)
  plant = plants_units[orispl_code]['name']
  layout_copy.title.text = '{} - {}, Unit {}'.format(layout.title.text, plant, unit_id)
  return layout_copy

app.index_string = app.index_string.replace("{%title%}", "WIDAP Dashboard")

cfg = config.getcfg()
conn = mysql.connector.connect(**cfg)

plants_units = load_plants_units("plants_units.csv")

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
      placeholder='Select a plant...'),
    'Unit:',
    dcc.Dropdown(id='unit-id-dropdown', placeholder='Select a unit...'),
    html.Button(id='load-data-button', children='Load'),
  ],
  id='plant-unit-selector',
  className='plot-selector'),

  html.H2('Monthly box plot of gross generation'),
  graph_component('monthly-generation-boxplot', GEN_BOXPLOT_LAYOUT),

  html.H2('Emissions time series'),
  graph_component('emissions-time-series', EMISSIONS_TIME_SERIES_LAYOUT),

  html.H2('Emissions intensity vs. capacity factor'),
  graph_component('emissions-intensity-vs-cf', EMISSIONS_INTENSITY_LAYOUT),

  html.H2('Histograms'),
  graph_component('efficiency-histogram', EFFICIENCY_HISTOGRAM_LAYOUT),
  # (b) Capacity factor (i) vs heat_input (ii) vs generation
  graph_component('capacity-factor-histogram', CAPACITY_FACTOR_HISTOGRAM_LAYOUT),
  # (c) Emissions intensity histogram for (i-iv) CO2e, CO2, SO2, NOx
])

@app.callback(
    Output('unit-id-dropdown', 'options'),
    [Input('plant-dropdown', 'value')])
def set_unit_id_options(selected_plant):
  if selected_plant in plants_units:
    unit_ids = plants_units[selected_plant]['unit_ids']
    return [{'label': x, 'value': x} for x in unit_ids]
  return ''

@app.callback(
    Output('unit-id-dropdown', 'value'),
    [Input('plant-dropdown', 'value')])
def clear_unit_id_field(unused_plant):
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
    [Input('datastore', 'data')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def update_monthly_generation_boxplot(df_json, orispl_code, unit_id):
  df = load_data_from_json(df_json)
  boxes = []
  for ts, monthly_gen in df.gen.groupby(pd.Grouper(freq='M')):
    boxes.append(go.Box(
      y=monthly_gen,
      name='{}-{:02d}'.format(ts.year, ts.month),
      showlegend=False,
      boxpoints=False,
      marker={'color': 'rgba(90, 110, 152, 0.8)'},
      line={
        'color': 'rgb(90, 110, 152)',
        'width': 0.9,
      },
      fillcolor='rgba(240, 240, 240, 0.9)',
      whiskerwidth=0.8,
      hoverlabel={
        'bgcolor': 'rgba(255, 255, 255, 0.9)',
        'bordercolor': 'rgb(90, 110, 152)',
        'font': {'color': 'rgb(90, 110, 152)', 'family': STD_FONT_FAMILY},
      },
    ))
  return {
    'data': boxes,
    'layout': titled_layout(GEN_BOXPLOT_LAYOUT, orispl_code, unit_id),
  }

@app.callback(
    Output('emissions-time-series', 'figure'),
    [Input('datastore', 'data')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def update_emissions_time_series(df_json, orispl_code, unit_id):
  df = load_data_from_json(df_json)
  def emissions_line(col, text, line_color, yaxis='y'):
    return go.Scattergl(
      x=df.index,
      y=df[col],
      yaxis=yaxis,
      text=text,
      hoverinfo='x+y+text',
      hoverlabel={'font': STD_FONT},
      line={'color': line_color})
  return {
    'data': [
      emissions_line('so2_mass', 'SO<sub>2</sub> mass (lbs/hr)', 'green'),
      emissions_line('nox_mass', 'NO<sub>x</sub> mass (lbs/hr)', 'orangered', yaxis='y2'),
      emissions_line('co2_mass', 'CO<sub>2</sub> mass (tons/hr)', 'steelblue', yaxis='y3'),
    ],
    'layout': titled_layout(EMISSIONS_TIME_SERIES_LAYOUT, orispl_code, unit_id),
  }

@app.callback(
    Output('emissions-intensity-vs-cf', 'figure'),
    [Input('datastore', 'data')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def emissions_intensity_vs_cf_scatterplot(df_json, orispl_code, unit_id):
  raw = load_data_from_json(df_json).sample(frac=1) # shuffle rows
  raw['cf'] = raw.gen / raw.gen.max()
  df = raw[raw.cf > 0.02] # TODO: Determine if this is a sane threshold
  co2_intensity = KG_PER_TON * df.co2_mass / df.gen
  so2_intensity = KG_PER_LB * df.so2_mass / df.gen
  layout = copy.copy(EMISSIONS_INTENSITY_LAYOUT)
  # TODO: Consider using 1.5 * q3 or something like that
  layout.yaxis.range = [0, 2.0 * co2_intensity.median()]
  layout.yaxis2.range = [0, 2.0 * so2_intensity.median()]
  data = []
  for ei, xax, yax in ((co2_intensity, 'x', 'y'), (so2_intensity, 'x2', 'y2')):
    data.append(go.Scattergl(
      x=jitter(df.cf, 0.005),
      y=ei,
      xaxis=xax,
      yaxis=yax,
      text=df.index,
      mode='markers',
      hoverinfo='x+y+text',
      hoverlabel={'font': STD_FONT},
      marker={
        'size': 3.5,
        'color': df.index.year,
        'colorscale': 'Viridis',
        'showscale': True,
      }),
    )
  return {'data': data, 'layout': titled_layout(layout, orispl_code, unit_id)}

@app.callback(
    Output('efficiency-histogram', 'figure'),
    [Input('datastore', 'data')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def update_efficiency_histogram(df_json, orispl_code, unit_id):
  df = load_data_from_json(df_json)
  filtered = df[df.heat_input > 0] 
  return {
    'data': [go.Histogram(
      x=filtered.gen / (filtered.heat_input * WH_PER_BTU),
      xbins={'start': 0.0, 'end': 1.0},
      hoverlabel={'font': STD_FONT},
    )],
    'layout': titled_layout(EFFICIENCY_HISTOGRAM_LAYOUT, orispl_code, unit_id),
  }

@app.callback(
    Output('capacity-factor-histogram', 'figure'),
    [Input('datastore', 'data')],
    [State('plant-dropdown', 'value'),
     State('unit-id-dropdown', 'value')])
def update_capacity_factor_histogram(df_json, orispl_code, unit_id):
  df = load_data_from_json(df_json)
  def make_hist(xdata, **kwargs):
    return go.Histogram(
      x=xdata, hoverinfo='x+y+text', hoverlabel={'font': STD_FONT}, **kwargs)
  return {
    'data': [
      make_hist(df.heat_input / df.heat_input.max()),
      make_hist(df.gen / df.gen.max(), xaxis='x2', yaxis='y2'),
    ],
    'layout': titled_layout(CAPACITY_FACTOR_HISTOGRAM_LAYOUT, orispl_code, unit_id),
  }


if __name__ == '__main__':
  # In production, this won't be invoked directly.
  app.run_server(debug=True)
