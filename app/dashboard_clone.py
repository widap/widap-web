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
from dash.dependencies import Input, Output, State
from dash.exceptions import PreventUpdate

app = dash.Dash(__name__)
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

  # dcc.Graph(id='monthly-gload-boxplot', config={'displaylogo': False}),

  dcc.Graph(id='gload-time-series', config={'displaylogo': False}),
])

# TODO: POTENTIALLY Add caching on the server side, for user changing
#  browsers, etc. Not sure how important this part is. But the dcc.Store is.
# Sharing state: https://dash.plot.ly/sharing-data-between-callbacks
# Store: https://dash.plot.ly/dash-core-components
# Caching: https://dash.plot.ly/performance

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
def load_plant_unit_data(n_clicks, orispl_code, unitid):
  if n_clicks is None:
    raise PreventUpdate
  if orispl_code and unitid:
    query_text = '''
        SELECT adddate(op_date, interval op_hour hour) as datetime,
            gload * op_time as gload,
            so2_mass,
            nox_mass,
            co2_mass,
            heat_input
        FROM data
        WHERE orispl_code = {} AND unitid = "{}"
        LIMIT 200000 # we should never need more than this
    '''.format(orispl_code, unitid)
    return pd.read_sql(query_text, conn).to_json(orient='split', date_unit='s')
  return ''

@app.callback(
  Output('gload-time-series', 'figure'),
  [Input('datastore', 'data')])
def update_gload_time_series(df_json):
  df = pd.read_json(df_json, orient='split', date_unit='s')
  return {
    'data': [go.Scattergl(
      x=df['datetime'],
      y=df['gload'],
      text='some stuff',
    )],
    'layout': go.Layout(
      xaxis={
        'title': 'some xaxis title',
        'type': 'date',
        'rangeslider': {
          'visible': True,
        },
      },
      yaxis={
        'title': 'the yaxis title',
      },
      margin={'l': 40, 'b': 40, 't': 10, 'r': 10},
    ),
  }

if __name__ == '__main__':
  # TODO: Multiple threads/processes?
  app.run_server(debug=True)
