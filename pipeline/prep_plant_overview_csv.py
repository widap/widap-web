"""
Given the ORISPL_CODE of a plant, prepares the monthly gload quartiles and 
normalized emissions time series to display on the globe view page.
"""
import pandas as pd
import sql_session
import sys

USAGE = "Usage: python prep_plant_overview_csv.py <ORISPL_CODE>"

def month_range(index):
    return [x.date().isoformat() for x in [index[0], index[-1]]]

def fetch_plant_data(orispl_code):
    query = """
        SELECT adddate(`op_date`, interval `op_hour` hour) as `datetime`,
            SUM(`gload`) as `gload`,
            SUM(`so2_mass`) as `so2_mass`,
            SUM(`nox_mass`) as `nox_mass`,
            SUM(`co2_mass`) as `co2_mass`,
            SUM(`heat_input`) as `heat_input`
        FROM `data`
        WHERE `orispl_code` = {}
        GROUP BY `datetime`
        """.format(orispl_code)
    return sql_session.SqlSession().execute_query(query, index_col='datetime')

def monthly_mean(series):
    return series.fillna(0).groupby(pd.Grouper(freq='1M')).mean()

def fetch_monthly_overview_data(orispl_code):
    """Returns a monthly DataFrame containing emissions and gload quartiles."""
    df = fetch_plant_data(orispl_code)
    gload_renaming = {
        "min": "min_gload_mw",
        "25%": "q1_gload_mw",
        "50%": "q2_gload_mw",
        "75%": "q3_gload_mw",
        "max": "max_gload_mw",
    }
    monthly = df.gload.fillna(0.0).groupby(pd.Grouper(freq='1M')).describe().fillna(0.0)
    monthly = monthly.filter(gload_renaming.keys()).rename(columns=gload_renaming)
    monthly["avg_co2_mass_tons_hr"] = monthly_mean(df.co2_mass)
    monthly["avg_so2_mass_lbs_hr"] = monthly_mean(df.so2_mass)
    monthly["avg_nox_mass_lbs_hr"] = monthly_mean(df.nox_mass)
    monthly.index = monthly.index.strftime("%Y-%m")
    monthly.index.name = "year_month"
    return monthly.round(2)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    print(fetch_monthly_overview_data(sys.argv[1]).to_csv())
