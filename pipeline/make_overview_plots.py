import json
import numpy as np
import matplotlib.pyplot as plt
import sys

# Super hacky
# https://stackoverflow.com/questions/47404653/pandas-0-21-0-timestamp-compatibility-issue-with-matplotlib
import pandas.plotting._converter as pandacnv
pandacnv.register()

USAGE = "Usage: python make_overview_plots.py <orispl_codes_file>"

def save_gload_trend_svg(orispl_code, overview_data):
    gload = overview_data["monthly_gload_quartiles"]
    dt = [np.datetime64(x) for x in gload['index']]
    lower_q = []
    upper_q = []
    for x in gload['data']:
        iqr = x[3] - x[1]
        upper_q.append(min(x[4], x[2] + 1.5 * iqr))
        lower_q.append(max(x[0], x[2] - 1.5 * iqr))
    plt.clf()
    plt.fill_between(dt, lower_q, upper_q, facecolor='gray', alpha=0.6)
    plt.plot(dt, [x[2] for x in gload['data']])
    plt.title("Monthly gload trend")
    plt.xlabel("Date")
    plt.ylabel("Gross load (MW)")
    plt.grid()
    plt.xlim(dt[0], dt[-1])
    plt.tight_layout()
    plt.savefig("../data/overview/svg/gloadtrend/%s.svg" % orispl_code, transparent=True, bbox='tight')

def save_normalized_emissions_svg(orispl_code, overview_data):
    gload = overview_data["monthly_gload_quartiles"]
    emis = overview_data["normalized_emissions"]
    dt = [np.datetime64(x) for x in gload['index']]
    plt.clf()
    plt.plot(dt, emis['so2_mass'], label='SOx')
    plt.plot(dt, emis['nox_mass'], label='NOx')
    plt.plot(dt, emis['co2_mass'], label='CO2')
    plt.legend()
    plt.title("Average monthly normalized emissions")
    plt.xlabel("Date")
    plt.ylabel("Emissions / mean emissions")
    plt.grid()
    plt.tight_layout()
    plt.xlim(dt[0], dt[-1])
    plt.savefig("../data/overview/svg/normalizedemissions/%s.svg" % orispl_code, transparent=True)

def generate_plots(orispl_codes):
    for orispl_code in orispl_codes:
        try:
            with open("../data/overview/%s.json" % orispl_code) as f:
                overview_data = json.loads(f.read())
            save_gload_trend_svg(orispl_code, overview_data)
            save_normalized_emissions_svg(orispl_code, overview_data)
        except Exception as e:
            print("I had a problem with", orispl_code)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    with open(sys.argv[1]) as f:
        orispl_codes = [x.strip() for x in f]
    generate_plots(orispl_codes)
