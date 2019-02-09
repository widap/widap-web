function renderEmissionsTimeSeries(divId, dt, data, type, layoutOpts, config) {
  const traces = [
    {
      type: type,
      name: 'SO2 (lbs/hr)',
      x: dt,
      y: data['so2'],
      line: {color: 'green', width: 1.5},
    },
    {
      type: type,
      name: 'NOx (lbs/hr)',
      x: dt,
      y: data['nox'],
      yaxis: 'y2',
      line: {color: 'xkcd:orange', width: 1.5},
    },
    {
      type: type,
      name: 'CO2 (tons/hr)',
      x: dt,
      y: data['co2'],
      yaxis: 'y3',
      line: {color: 'steelblue', width: 1.5},
    }
  ]

  var layout = {
    showlegend: false,
    font: {family: "'Source Sans Pro', 'Open Sans', sans-serif"},
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
    yaxis: {title: {text: 'SO<sub>2</sub> (lbs/hr)'}},
    yaxis2: {title: {text: 'NO<sub>x</sub> (lbs/hr)'}},
    yaxis3: {title: {text: 'CO<sub>2</sub> (tons/hr)'}},
  }
  Object.keys(layoutOpts).forEach(k => layout[k] = layoutOpts[k])
  Plotly.react(divId, traces, layout, config);
}

function renderDeepDiveEmissionsTimeSeries(divId, data) {
  const dt = data.map(d => d.datetime)
  const mapped = {
    'so2': data.map(d => d.so2_mass),
    'nox': data.map(d => d.nox_mass),
    'co2': data.map(d => d.co2_mass),
  }
  const layoutOpts = {
    autosize: true,
    xaxis: {rangeslider: {}, type: 'date'},
  }
  renderEmissionsTimeSeries(divId, dt, mapped, 'scattergl', layoutOpts, {displaylogo: false})
}

function renderOverviewEmissionsTimeSeries(divId, data) {
  const dt = data.map(d => d.year_month)
  const mapped = {
    'so2': data.map(d => d.avg_so2_mass_lbs_hr),
    'nox': data.map(d => d.avg_nox_mass_lbs_hr),
    'co2': data.map(d => d.avg_co2_mass_tons_hr),
  }
  const layoutOpts = {
    height: 360,
    paper_bgcolor: 'rgba(255,255,255,0.1)',
    plot_bgcolor: 'rgba(255,255,255,0.1)',
    xaxis: {
      rangeslider: {},
      type: 'date',
      tickformat: '%b %Y',
    },
    margin: {l: 50, r: 10, t: 10, b: 10},
  }
  renderEmissionsTimeSeries(divId, dt, mapped, 'scatter', layoutOpts, {displayModeBar: false})
}
