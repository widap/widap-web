"""
Queries the plants SQL table for plants in WIEB's purview, then downloads and
cleans them before printing CSV to stdout.
"""
import pandas as pd
import mysql.connector
import config

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)

USEFUL_COLS = (
    "state",
    "county",
    "name",
    "latitude",
    "longitude",
    "orispl_code",
    "operator",
    "primary_fuel",
    "year",
)

aggregators = {col: "last" for col in USEFUL_COLS}
aggregators["year"] = lambda x: "%s-%s" % (min(x), max(x))

def fetch_plants_table():
    query_fmt = "SELECT {} FROM plants WHERE STATE IN {} OR ORISPL_CODE IN {}"
    conn = mysql.connector.connect(**config.getcfg())
    query_text = query_fmt.format(", ".join(USEFUL_COLS), WIEB_STATES, TX_PLANTS)
    return pd.read_sql(query_text, conn) \
        .groupby("orispl_code") \
        .agg(aggregators) \
        .rename(columns={"year": "years"}) \
        .drop(["orispl_code"], axis=1)

if __name__ == '__main__':
    print(fetch_plants_table().to_csv())
