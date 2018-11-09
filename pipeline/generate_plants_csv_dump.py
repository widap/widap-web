"""
Queries the plants SQL table for plants in WIEB's purview, then downloads and
cleans them before dumping to CSV.

Either use as a standalone script or import and invoke generate_plants_table().
"""
import config
import mysql.connector
import pandas as pd
import sys

USAGE = "Usage: python " + sys.argv[0] + " <output_csv>"

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)
SQL_QUERY_TEXT = (
    "SELECT * FROM plants WHERE STATE IN %s OR ORISPL_CODE IN %s" \
     % (WIEB_STATES, TX_PLANTS))

COLS_TO_DROP = ["SYSTEM", "PRIMARY_REP", "SECONDARY_REP", "SECONDARY_FUEL", "OWNER", "UNITID"]
USEFUL_COLS = ["STATE", "COUNTY", "NAME", "LATITUDE", "LONGITUDE", "OPERATOR", "PRIMARY_FUEL"]

aggregators = {col: "last" for col in USEFUL_COLS}
aggregators["YEAR"] = lambda x: "%s-%s" % (min(x), max(x))


def generate_plants_table():
    cfg = config.getcfg()
    server = mysql.connector.connect(
        host=cfg["host"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"])
    query = server.cursor(buffered=True)

    query.execute(SQL_QUERY_TEXT)

    df = pd.DataFrame(data=query.fetchall(), index = None, columns = query.column_names)

    return df.drop(COLS_TO_DROP, axis=1) \
        .groupby("ORISPL_CODE") \
        .agg(aggregators) \
        .rename(columns={"YEAR": "YEARS"})


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    output_file = sys.argv[1]
    df = generate_plants_table()
    with open(output_file, 'w') as f:
        f.write(df.to_csv())
