# -*- encoding: utf-8 -*-
import config
import dash
import dash_core_components as dcc
import dash_html_components as html
import mysql.connector
import pandas as pd
import plotly.graph_objs as go
from dash.dependencies import Input, Output
# from random import sample

# Above this threshold, use WebGL for rendering. It's not as pretty and clean as
# SVG, but it's orders of magnitude faster. Attempting to render all ~150k
# hourly data points is infeasible with SVG and quite tractable with WebGL.
MAX_POINTS_FOR_SVG = 1000

app = dash.Dash(__name__)

cfg = config.getcfg()
conn = mysql.connector.connect(
  host=cfg["host"],
  database=cfg["database"],
  user=cfg["user"],
  password=cfg["password"])

# TODO: Change query based on user input.
sql_query = 'SELECT * FROM data WHERE orispl_code=113 AND unitid=1 LIMIT 10000'

# TODO: Load plants/units data into memory at app startup. That's probably the
# best thing we can do before getting user input.

df = pd.read_sql_query(sql_query, conn)
df = df.rename(str.lower, axis='columns').fillna(0.0)
  # .sample(999) # REMOVE ME!

# TODO: Process datetime in the database directly, or on the read operation, so
# that we don't have to do that here.
dt = pd.to_datetime(df.op_date) + pd.to_timedelta(df.op_hour, unit='h')
df.index = pd.DatetimeIndex(dt)
df.drop(["op_date", "op_hour"], axis=1, inplace=True)

# TODO: We shouldn't HAVE to sort.
df.sort_index(inplace=True)


selectable_columns = set(df.columns.unique()).difference(
  ('state', 'orispl_code', 'unitid', 'op_time')
)

app.layout = html.Div([
  html.H1('WIDAP Dash App'),

  html.P('Somewhere in here we are going to have to allow the user to select a plant and unit.'),

  html.Div([
    dcc.Dropdown(
      id='plant-name',
      options=[{'label': 'Cholla', 'value': 113}],
      value=113,
      clearable=False),
  ],
  className='plot-selector'),

  html.H2('Scatter plot visualization'),

  html.Div([
    html.Div([
      html.H3('x-axis'),
      dcc.Dropdown(
        id='xaxis-column',
        options=[{'label': i, 'value': i} for i in selectable_columns],
        value='heat_input',
        clearable=False,
      ),
      dcc.RadioItems(
        id='xaxis-type',
        options=[{'label': i, 'value': i} for i in ('linear', 'log')],
        value='linear',
      )
    ],
    className='plot-selector',
    ),

    html.Div([
      html.H3('y-axis'),
      dcc.Dropdown(
        id='scatter-yaxis-var',
        options=[{'label': i, 'value': i} for i in selectable_columns],
        value='so2_mass',
        clearable=False,
      ),
      dcc.RadioItems(
        id='yaxis-type',
        options=[{'label': i, 'value': i} for i in ('linear', 'log')],
        value='linear',
      )
    ],
    className='plot-selector',
    ),
  ]),

  dcc.Graph(id='scatter-plot', config={'displaylogo': False}),

  # dcc.RangeSlider(
    # id='date-slider',
    # min=df.index.min(),
    # max=df.index.max(),
    # step=30,
    # value=[df.index.min(), df.index.max()],
    # marks={str(op_date): str(op_date) for op_date in df['op_date'].unique()}
  # ),

  html.H2('Time series visualization'),

  html.Div([
    html.H3('dependent variable'),
    dcc.Dropdown(
      id='timeseries-yaxis-var',
      options=[{'label': i, 'value': i} for i in selectable_columns],
      value='gload',
    ),
  ],
  className='plot-selector'),

  dcc.Graph(id='time-series-plot', config={'displaylogo': False}),
])

def choose_scatter_method(nrows):
  return go.Scattergl if nrows > MAX_POINTS_FOR_SVG else go.Scatter

@app.callback(
  dash.dependencies.Output('scatter-plot', 'figure'),
  [dash.dependencies.Input('xaxis-column', 'value'),
   dash.dependencies.Input('scatter-yaxis-var', 'value'),
   dash.dependencies.Input('xaxis-type', 'value'),
   dash.dependencies.Input('yaxis-type', 'value')])
   # dash.dependencies.State('date-slider', 'value')])
def update_scatterplot(xaxis_column_name, yaxis_column_name, xaxis_type, yaxis_type):
  # dff = df[df['op_date'] >= date_value[0]][df['op_date'] <= date_value[1]]
  dff = df
  return {
    'data': [choose_scatter_method(len(dff))(
      x=dff[xaxis_column_name],
      y=dff[yaxis_column_name],
      text=dff.index,
      mode='markers',
      marker={
        'size': 8,
        'color': '#7AB',
        'opacity': 0.75,
        'line': {'width': 2.0, 'color': 'teal'}
      }
    )],
    'layout': go.Layout(
      xaxis={
        'title': xaxis_column_name,
        'type': xaxis_type,
      },
      yaxis={
        'title': yaxis_column_name,
        'type': yaxis_type,
      },
      margin={'l': 40, 'b': 40, 't': 10, 'r': 10},
      hovermode='closest',
    )
  }


@app.callback(
  dash.dependencies.Output('time-series-plot', 'figure'),
  [dash.dependencies.Input('timeseries-yaxis-var', 'value')])
def update_timeseries(yaxis_var):
  # TODO: Allow rendering of simultaneous time series. Unsure if they should
  # share a y-axis or not.
  scatter_method = go.Scatter if len(df) <= MAX_POINTS_FOR_SVG else go.Scattergl
  return {
    'data': [choose_scatter_method(len(df))(
      x=df.index,
      y=df[yaxis_var],
      text=df[yaxis_var],
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
          'title': yaxis_var,
        },
        margin={'l': 40, 'b': 40, 't': 10, 'r': 10},
        hovermode='closest',
      )
  }

if __name__ == '__main__':
  app.run_server(debug=True)
