import sql_session
import pandas as pd

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)

def fetch_plant_capacities():
    """Returns the maximum gload served by each plant.

    Maximum gload is defined here as the maximum over all hourly intervals of
    the sum of gloads for all units in a plant. In other words, it is possible
    that each unit in a plant served a higher load at some point during the data
    collection period, but at no point during the data collection period did the
    plant as a whole register a higher gload.
    """
    conditions = ["ORISPL_CODE IN " + str(TX_PLANTS)]
    for state in WIEB_STATES:
        conditions.append("STATE='%s'" % state)
    session = sql_session.SqlSession()
    df = pd.DataFrame()
    for condition in conditions:
        print("On query with condition", condition)
        query = """
            SELECT ORISPL_CODE, MAX(GLOAD) AS MAX_GLOAD
            FROM
                (SELECT ORISPL_CODE, OP_DATE, OP_HOUR, SUM(GLOAD) AS GLOAD
                FROM data
                WHERE GLOAD > 0 AND {}
                GROUP BY ORISPL_CODE, OP_DATE, OP_HOUR) AS byplant
            GROUP BY ORISPL_CODE
        """.format(condition)
        df = df.append(session.execute_query(query))
    df.index = df.orispl_code
    return df.drop(["orispl_code"], axis=1)

if __name__ == '__main__':
  print(fetch_plant_capacities().to_csv())
