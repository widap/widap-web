function renderEmissionsTimeSeries(divId, data) {
  const dt = data.map(d => d.year_month)

  const so2Trace = {
    type: 'scatter',
    name: 'SO2 (lbs/hr)',
    x: dt,
    y: data.map(d => d.avg_so2_mass_lbs_hr),
    line: {
      color: 'green',
      width: 1.0,
    },
  }

  const noxTrace = {
    type: 'scatter',
    name: 'NOx (lbs/hr)',
    x: dt,
    y: data.map(d => d.avg_nox_mass_lbs_hr),
    xaxis: 'x2',
    yaxis: 'y2',
    line: {
      color: 'orange',
      width: 1.0,
    },
  }

  const co2Trace = {
    type: 'scatter',
    name: 'CO2 (tons/hr)',
    x: dt,
    y: data.map(d => d.avg_co2_mass_tons_hr),
    xaxis: 'x3',
    yaxis: 'y3',
    line: {
      color: 'steelblue',
      width: 1.0,
    },
  }

  const traces = [so2Trace, noxTrace, co2Trace]

  const layout = {
    grid: {
      rows: 3,
      columns: 1,
      pattern: 'independent',
      roworder: 'bottom to top',
    },
    legend: {traceorder: 'reversed'},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      family: "'Source Sans Pro', 'Open Sans', sans-serif",
    },
    margin: {
      l: 40,
      r: 10,
      t: 10,
      b: 10,
    }
  }
  Plotly.plot(divId, traces, layout, {displaylogo: false});
}
