import config
import pandas as pd
import mysql.connector

class SqlSession(object):
    """A wrapper around a MySQL connection to enforce common patterns."""

    def __init__(self):
        self.conn = mysql.connector.connect(**config.getcfg())

    def execute_query(self, query_string, **kwargs):
        """Returns a DataFrame for the query, with lowercase colnames."""
        df = pd.read_sql(query_string, self.conn, **kwargs)
        df.columns = df.columns.str.lower()
        return df
