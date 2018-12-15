import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import sys

USAGE = "Usage: python make_overview_plots.py < orispl_codes.txt"

def save_gload_trend_svg(orispl_code, df):
    dt = [np.datetime64(x) for x in df.year_month]
    plt.clf()
    plt.fill_between(dt, df.min_gload_mw, df.max_gload_mw, facecolor='gray', alpha=0.3)
    plt.fill_between(dt, df.q1_gload_mw, df.q3_gload_mw, facecolor='gray', alpha=0.6)
    plt.plot(dt, df.q2_gload_mw)
    plt.title("Monthly gross load trend (MW)")
    plt.xlabel("Date")
    plt.grid()
    plt.xlim(dt[0], dt[-1])
    plt.ylim(bottom=0) # let matplotlib figure out the top
    plt.tight_layout()
    plt.savefig("../img/svg/gloadtrend/%s.svg" % orispl_code, transparent=True, bbox='tight')

def save_emissions_svg(orispl_code, df):
    dt = [np.datetime64(x) for x in df.year_month]
    plt.clf()

    ax1 = plt.subplot(311)
    plt.plot(dt, df.avg_so2_mass_lbs_hr, label='SO2 (lbs)', color='green')
    plt.setp(ax1.get_xticklabels(), visible=False)
    plt.legend()
    plt.grid()
    plt.title("Mean hourly emissions")

    ax2 = plt.subplot(312, sharex=ax1)
    plt.plot(dt, df.avg_nox_mass_lbs_hr, label='NOx (lbs)', color='xkcd:orange')
    plt.setp(ax2.get_xticklabels(), visible=False)
    plt.legend()
    plt.grid()

    ax3 = plt.subplot(313, sharex=ax1)
    plt.plot(dt, df.avg_co2_mass_tons_hr, label='CO2 (tons)', color='steelblue')
    plt.xlim(dt[0], dt[-1])
    plt.legend()
    plt.grid()
    plt.xlabel("Date")

    plt.tight_layout()
    plt.savefig("../img/svg/emissions/%s.svg" % orispl_code, transparent=True)

def generate_plots(orispl_code):
    df = pd.DataFrame()
    try:
        df = pd.read_csv("../csv/monthly/%s.csv" % orispl_code)
    except Exception as e:
        print("I had a problem with", orispl_code)
        return
    save_gload_trend_svg(orispl_code, df)
    save_emissions_svg(orispl_code, df)

if __name__ == '__main__':
    for line in sys.stdin:
        orispl_code = line.strip()
        print("Processing", orispl_code)
        generate_plots(orispl_code)
