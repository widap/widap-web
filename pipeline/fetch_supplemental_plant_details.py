import sql_session
import pandas as pd

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)

def fetch_plant_capacity_and_co2(session, condition):
    query = """
        SELECT ORISPL_CODE, MAX(GLOAD) AS MAX_GLOAD, SUM(CO2_MASS) AS TOTAL_CO2
        FROM
            (SELECT ORISPL_CODE, OP_DATE, OP_HOUR, SUM(GLOAD) AS GLOAD, SUM(CO2_MASS) AS CO2_MASS
            FROM data
            WHERE GLOAD > 0 AND {}
            GROUP BY ORISPL_CODE, OP_DATE, OP_HOUR) AS byplant
        GROUP BY ORISPL_CODE
    """.format(condition)
    return session.execute_query(query)


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
    session = sql_session.SqlSession()
    df = pd.DataFrame()
    for condition in conditions:
        print("On query with condition", condition)
        df = df.append(fetch_plant_capacity_and_co2(session, condition))
    df.index = df.orispl_code
    return df.drop(["orispl_code"], axis=1)


if __name__ == '__main__':
  print(fetch_all_supplemental_plant_details().to_csv())
