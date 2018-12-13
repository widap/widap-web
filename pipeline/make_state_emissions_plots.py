"""Produces emissions and gload plots at a state level from the input CSV."""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import sys

USAGE = "Usage: python make_state_emissions_plots.py <state_emissions_csv_file>"

def produce_state_emissions_plot(state):
    state_emis = df[df.state == state]
    state_emis.index = pd.DatetimeIndex(state_emis.yearMonth)
    filtered = state_emis.loc[state_emis.index < '2018-01']

    dt = [np.datetime64(x) for x in filtered.index]
    # Remove 2018 data; not sure it's validated
    # dt = [t for t in dt if t < np.datetime64('2018-01')]
    co2_emis = filtered.CO2[dt]

    plt.clf()

    ax1 = plt.subplot(311)
    plt.plot(dt, filtered.SO2, label="SO2 (lbs)", color='green')
    plt.setp(ax1.get_xticklabels(), visible=False)
    plt.legend()
    plt.grid()
    plt.title("Monthly emissions")

    ax2 = plt.subplot(312, sharex=ax1)
    plt.plot(dt, filtered.NOx, label="NOx (lbs)", color='xkcd:orange')
    plt.setp(ax2.get_xticklabels(), visible=False)
    plt.legend()
    plt.grid()

    ax3 = plt.subplot(313, sharex=ax1)
    plt.plot(dt, filtered.CO2, label="CO2 (tons)", color='steelblue')

    plt.legend()
    plt.grid()
    plt.xlim(dt[0], dt[-1])
    plt.xlabel("Date")

    plt.tight_layout()
    plt.savefig("../img/svg/emissions/%s.svg" % state.lower(), transparent=True)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit()
    df = pd.read_csv(sys.argv[1])
    for state in pd.unique(df.state):
        produce_state_emissions_plot(state)
