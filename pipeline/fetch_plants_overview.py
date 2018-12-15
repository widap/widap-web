"""
Queries the plants SQL table for plants in WIEB's purview, then downloads and
cleans them before printing CSV to stdout.
"""
import pandas as pd
import sql_session

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
    query_fmt = "SELECT * FROM plants WHERE STATE IN {} OR ORISPL_CODE IN {}"
    session = sql_session.SqlSession()
    df = session.execute_query(query_fmt.format(WIEB_STATES, TX_PLANTS))

    return df.filter(USEFUL_COLS, axis=1) \
        .groupby("orispl_code") \
        .agg(aggregators) \
        .rename(columns={"year": "years"})
        .drop(["orispl_code"], axis=1)

if __name__ == '__main__':
    print(fetch_plants_table().to_csv())
