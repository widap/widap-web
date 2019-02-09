# -*- encoding: utf-8 -*-

"""Reads data from the SQL table and dumps it to the specified location.

This ends up being useful because reads from the AWS copy of the SQL database
are exceedingly slow.
"""

import argparse
import pandas as pd
import config
import mysql.connector
import os

QUERY_FMT = ' '.join((
    'SELECT adddate(op_date, interval op_hour hour) as datetime,',
    'gload * op_time as gen,',
    'so2_mass,',
    'nox_mass,',
    'co2_mass,',
    'heat_input',
    'FROM data',
    'WHERE orispl_code = {} AND unitid = \"{}\"'))

def load_plants_units(path):
  df = pd.read_csv(path, index_col='orispl_code')
  df.unit_ids = df.unit_ids.str.split('/')
  return df.filter(['unit_ids'], axis=1).to_dict()['unit_ids']

def read_sql_data(conn, orispl_code, unit_id):
  # TODO: Add outlier filtering step in here
  query_text = QUERY_FMT.format(orispl_code, unit_id)
  return pd.read_sql(query_text, conn, index_col='datetime').sort_index()

def write_dataframe(df):
  return df.to_csv(orient='split', date_unit='s')

if __name__ == '__main__':
  parser = argparse.ArgumentParser(
      description='Dump compressed CSVs of time series data for individual units')
  parser.add_argument(
      'plants_units_csv',
      help='Path to the file containing unit names for each plant')
  parser.add_argument(
      'output_dir',
      help='Path to the directory where output files will be written')
  args = parser.parse_args()
  plant_units = load_plants_units(args.plants_units_csv)
  cfg = config.getcfg()
  conn = mysql.connector.connect(**cfg)
  for orispl_code, unit_ids in plant_units.items():
    for unit_id in unit_ids:
      df = read_sql_data(conn, orispl_code, unit_id)
      filename = '{}_{}.csv'.format(orispl_code, unit_id.replace('*', ''))
      output_path = os.path.join(args.output_dir, filename)
      df.round(6).to_csv(output_path)
      print('Wrote', output_path)
