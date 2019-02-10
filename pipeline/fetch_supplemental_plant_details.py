import config
import mysql.connector
import pandas as pd

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)

def fetch_plant_capacity_and_co2(conn, condition):
    query = """
        SELECT orispl_code, MAX(gload) AS max_gload, SUM(co2_mass) AS total_co2
        FROM
            (SELECT orispl_code, op_date, op_hour, SUM(gload) AS gload, SUM(co2_mass) AS co2_mass
            FROM data
            WHERE gload > 0 AND {}
            GROUP BY orispl_code, op_date, op_hour) AS byplant
        GROUP BY orispl_code
    """.format(condition)
    return pd.read_sql(query, conn, index_col='orispl_code')


def fetch_all_supplemental_plant_details():
    """Returns the maximum gload served and total co2 emitted by each plant.

    Maximum gload is defined here as the maximum over all hourly intervals of
    the sum of gloads for all units in a plant. In other words, it is possible
    that each unit in a plant served a higher load at some point during the data
    collection period, but at no point during the data collection period did the
    plant as a whole register a higher gload.
    """
    conditions = ["ORISPL_CODE IN " + str(TX_PLANTS)]
    for state in WIEB_STATES:
        conditions.append("STATE='%s'" % state)
    df = pd.DataFrame()
    conn = mysql.connector.connect(**config.getcfg())
    for condition in conditions:
        print("On query with condition", condition)
        df = df.append(fetch_plant_capacity_and_co2(conn, condition))
    return df


if __name__ == '__main__':
  print(fetch_all_supplemental_plant_details().to_csv())
