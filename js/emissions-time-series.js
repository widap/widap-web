function renderEmissionsTimeSeries(divId, data) {
  const dt = data.map(d => d.year_month)

  const so2Trace = {
    type: 'scatter',
    name: 'SO2 (lbs/hr)',
    x: dt,
    y: data.map(d => d.avg_so2_mass_lbs_hr),
    line: {
      color: 'green',
      width: 1.5,
    },
  }

  const noxTrace = {
    type: 'scatter',
    name: 'NOx (lbs/hr)',
    x: dt,
    y: data.map(d => d.avg_nox_mass_lbs_hr),
    yaxis: 'y2',
    line: {
      color: 'xkcd:orange',
      width: 1.5,
    },
  }

  const co2Trace = {
    type: 'scatter',
    name: 'CO2 (tons/hr)',
    x: dt,
    y: data.map(d => d.avg_co2_mass_tons_hr),
    yaxis: 'y3',
    line: {
      color: 'steelblue',
      width: 1.5,
    },
  }

  const traces = [so2Trace, noxTrace, co2Trace]

  const layout = {
    showlegend: false,
    height: 360,
    paper_bgcolor: 'rgba(255,255,255,0.1)',
    plot_bgcolor: 'rgba(255,255,255,0.1)',
    font: {
      family: "'Source Sans Pro', 'Open Sans', sans-serif",
    },
    grid: {
      yaxes: ['y', 'y2', 'y3'],
      rows: 3,
      columns: 1,
    },
    xaxis: {
      rangeslider: {},
      type: 'date',
      tickformat: '%b %Y',
    },
    yaxis: {
      title: {
        text: 'SO<sub>2</sub> (lbs/hr)',
      },
    },
    yaxis2: {
      title: {
        text: 'NO<sub>x</sub> (lbs/hr)',
      },
    },
    yaxis3: {
      title: {
        text: 'CO<sub>2</sub> (tons/hr)',
      },
    },
    margin: {
      l: 50,
      r: 10,
      t: 10,
      b: 10,
    }
  }
  Plotly.plot(divId, traces, layout, {displayModeBar: false});
}
