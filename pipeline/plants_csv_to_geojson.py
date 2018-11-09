"""Converts CSV plant data into geoJSON suitable for display on the map."""

import pandas as pd
import json, math, sys

USAGE = "Usage: python " + sys.argv[0] + " <input_csv> <output_json>"

def checknan(value, default=""):
    if not isinstance(value, str) and math.isnan(value):
        return default
    return value

def row_to_feature(row):
    img_location = "%s_(%s)" % (row.NAME.lower().replace(" ", "_"), row.STATE)

    return {
      "type": "Feature",
      "properties": {
        "name": row.NAME,
        "fuel_source": checknan(row.PRIMARY_FUEL),
        "orispl_code": row.ORISPL_CODE,
        "operator": checknan(row.OPERATOR),
        "county": row.COUNTY,
        "imgloc": img_location,
        "capacity": row.MAX_GLOAD,
      },
      "geometry": {
        "type": "Point",
        "coordinates": [round(row.LONGITUDE, 6), round(row.LATITUDE, 6)]
      },
    }

def csv_to_geojson(input_csv):
    df = pd.read_csv(input_csv)
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
    input_csv, output_json = sys.argv[1:3]
    with open(output_json, 'w') as f:
        f.write(csv_to_geojson(input_csv))

