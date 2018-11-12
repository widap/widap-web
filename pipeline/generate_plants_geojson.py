"""Converts CSV plant data into geoJSON suitable for display on the map."""

import json
import math
import pandas as pd
import sys

USAGE = "Usage: python " + sys.argv[0] + " <plant_overview_csv> <plant_capacities_csv>"

def checknan(value, default=""):
    if not isinstance(value, str) and math.isnan(value):
        return default
    return value

def row_to_feature(row):
    return {
      "type": "Feature",
      "properties": {
        "name": row.name,
        "fuel_source": checknan(row.primary_fuel),
        "orispl_code": row.Index,
        "operator": checknan(row.operator),
        "county": row.county,
        "capacity": row.max_gload,
      },
      "geometry": {
        "type": "Point",
        "coordinates": [round(row.longitude, 6), round(row.latitude, 6)]
      },
    }

def join_csvs_and_dump_to_geojson(overview_csv, capacities_csv):
    overview = pd.read_csv(overview_csv)
    capacities = pd.read_csv(capacities_csv) 
    overview.index = overview.orispl_code
    capacities.index = capacities.orispl_code
    overview.drop(["orispl_code"], axis=1, inplace=True)
    capacities.drop(["orispl_code"], axis=1, inplace=True)
    df = overview.join(capacities)
    features = [row_to_feature(row) for row in df.itertuples()]
    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
        "name": "WidapPowerPlants"
    }
    return "var powerPlants = %s" % json.dumps(feature_collection)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(USAGE)
        sys.exit()
    overview_csv, capacities_csv = sys.argv[1:3]
    print(join_csvs_and_dump_to_geojson(overview_csv, capacities_csv))

