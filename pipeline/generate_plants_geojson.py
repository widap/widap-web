"""Converts CSV plant data into geoJSON suitable for display on the map."""

import json
import math
import pandas as pd
import sys

USAGE = "Usage: python " + sys.argv[0] + " <plant_overview_csv> <extra_plant_details_csv>"

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
        "capacity": checknan(row.max_gload, default="unknown"),
        "total_co2_emissions": checknan(row.total_co2, default="unknown"),
        "unit_ids": row.unit_ids.split("/"),
      },
      "geometry": {
        "type": "Point",
        "coordinates": [round(row.longitude, 6), round(row.latitude, 6)]
      },
    }

def join_csvs_and_dump_to_geojson(overview_csv, extra_details_csv):
    overview = pd.read_csv(overview_csv, index_col="orispl_code")
    supplemental = pd.read_csv(extra_details_csv, index_col="orispl_code")
    df = overview.join(supplemental)
    features = [row_to_feature(row) for row in df.itertuples()]
    return json.dumps(features, indent=2)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(USAGE)
        sys.exit()
    overview_csv, extra_details_csv = sys.argv[1:3]
    print(join_csvs_and_dump_to_geojson(overview_csv, extra_details_csv))

