"""
Given the ORISPL_CODE of a plant, prepares the gload quartiles and and CO2
emissions histogram for the plant to be used as input to the info sidebar in the
globe view of the plants.

"""
import json
import pandas as pd
import sql_session
import sys

USAGE = "Usage: python prep_plant_overview_plots.py <ORISPL_CODE>"

def month_range(index):
    return [x.date().isoformat() for x in [index[0], index[-1]]]

def fetch_plant_data(orispl_code):
    query_text = """
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
    df = sql_session.SqlSession().execute_query(query_text)
    df.index = pd.DatetimeIndex(df.datetime)
    return df.drop(columns=["datetime"], axis=1)

def monthly_gload_quartiles_data(df):
    """Returns a DataFrame containing gload quartiles, binned by month."""
    boxplot_cols = ["min", "25%", "50%", "75%", "max"]
    column_renaming = {
        "min": "min_gload",
        "25%": "q1_gload",
        "50%": "q2_gload",
        "75%": "q3_gload",
        "max": "max_gload",
    }
    by_month = df.gload.fillna(0.0).groupby(pd.Grouper(freq='1M')).describe()
    # TODO: Get rid of the index here.
    by_month.index = by_month.index.to_native_types()
    return by_month.filter(boxplot_cols).rename(columns=column_renaming)

def produce_normalized_emissions_data(df):
    """Returns a dict containing mean normalized daily emissions."""
    series = {}
    for gas in ("co2_mass", "so2_mass", "nox_mass"):
        normalized_hourly = df[gas].dropna() / df[gas].mean()
        series[gas] = normalized_hourly.groupby(pd.Grouper(freq='1M')).mean()
    emissions = pd.DataFrame(series).to_dict(orient='list')
    emissions["month_range"] = month_range(df.index)
    return emissions

def produce_overview_data(orispl_code):
    df = fetch_plant_data(orispl_code)
    gload_quartiles = monthly_gload_quartiles_data(df)
    normalized_emissions = produce_normalized_emissions_data(df)
    return {
        "monthly_gload_quartiles": gload_quartiles.to_dict(orient='split'),
        "normalized_emissions": normalized_emissions,
    }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    overview_data = produce_overview_data(sys.argv[1])
    print(json.dumps(overview_data))
