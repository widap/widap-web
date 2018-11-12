import config
import pandas as pd
import mysql.connector

class SqlSession(object):
    """A session wrapper around a MySQL cursor to ensure no weak references."""

    def __init__(self):
        cfg = config.getcfg()
        self.conn = mysql.connector.connect(
            host=cfg["host"],
            database=cfg["database"],
            user=cfg["user"],
            password=cfg["password"])
        self.cursor = self.conn.cursor(buffered=True)

    def execute_query(self, query_string):
        self.cursor.execute(query_string)
        return pd.DataFrame(
            data=self.cursor.fetchall(),
            index=None,
            columns=[s.lower() for s in self.cursor.column_names])
