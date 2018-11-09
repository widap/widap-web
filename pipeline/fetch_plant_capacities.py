import config
import mysql.connector
import pandas as pd

WIEB_STATES = ("WA", "CA", "OR", "NV", "AZ", "NM", "CO", "UT", "WY", "MT", "ID")
TX_PLANTS = (9, 58562, 3456)

def run_query(query, row_condition):
  query_text = ("" + \
      "SELECT ORISPL_CODE, STATE, UNITID, MAX(GLOAD) as MAX_GLOAD " + \
      "FROM data " + \
      "WHERE %s AND GLOAD > 0 " + \
      "GROUP BY ORISPL_CODE, UNITID") % row_condition
  query.execute(query_text)
  return pd.DataFrame(
      data=query.fetchall(), index = None, columns = query.column_names)

def run_all_queries():
  cfg = config.getcfg()
  server = mysql.connector.connect(
      host=cfg["host"],
      database=cfg["database"],
      user=cfg["user"],
      password=cfg["password"])
  # Seems to only want 1 connection at a time, for one user.
  query = server.cursor(buffered=True)
  dfs = []
  dfs.append(run_query(query, "ORISPL_CODE in %s" % (TX_PLANTS,)))
  for state in WIEB_STATES:
    dfs.append(run_query(query, "STATE='%s'" % state))
  return dfs