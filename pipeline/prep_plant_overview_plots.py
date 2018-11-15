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
    by_month.index = by_month.index.to_native_types()
    return by_month.filter(boxplot_cols).rename(columns=column_renaming)

def produce_co2_emissions_histogram(df):
    """Returns a list of binned co2 emissions along with the bin width."""
    co2_mass = df.co2_mass.dropna()
    hist = co2_mass.groupby(pd.cut(co2_mass, 20)).count()
    # Returning just the bin width loses no information; we can reconstruct
    # starting from 0 and taking multiples of the bin width.
    return {
        "bin_width": hist.index[0].right,
        "values": hist.values.tolist()
    }

def produce_overview_data(orispl_code):
    df = fetch_plant_data(orispl_code)
    gload_quartiles = monthly_gload_quartiles_data(df)
    co2_emissions_hist = produce_co2_emissions_histogram(df)
    return {
        "monthly_gload_quartiles": gload_quartiles.to_dict(orient='split'),
        "co2_emissions_histogram": co2_emissions_hist,
    }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    overview_data = produce_overview_data(sys.argv[1])
    print(json.dumps(overview_data))
