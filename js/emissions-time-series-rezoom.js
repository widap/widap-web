function newScatterTrace(data, opts) {
  return {
      type: 'scattergl',
      name: opts.name,
      x: data.map(d => d.datetime),
      y: data.map(d => d[opts.col]),
      yaxis: opts.yax,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: opts.color, width: 1.5},
  }
}

function renderEmissionsTimeSeries(divId, data) {
  const dt = data.map(d => d.datetime)
  const traces = [
      {name: 'SO2 (lbs/hr)', col: 'so2_mass', color: 'green', yax: 'y'},
      {name: 'NOx (lbs/hr)', col: 'nox_mass', color: 'xkcd:orange', yax: 'y2'},
      {name: 'CO2 (lbs/hr)', col: 'co2_mass', color: 'steelblue', yax: 'y3'},
  ].map(opts => newScatterTrace(data, opts))
  const layout = {
    showlegend: false,
    autosize: true,
    font: {family: STD_FONT_FAMILY},
    grid: {
      yaxes: ['y', 'y2', 'y3'],
      rows: 3,
      columns: 1,
    },
    xaxis: {type: 'date'},
    yaxis: {title: {text: 'SO<sub>2</sub> (lbs/hr)'}},
    yaxis2: {title: {text: 'NO<sub>x</sub> (lbs/hr)'}},
    yaxis3: {title: {text: 'CO<sub>2</sub> (tons/hr)'}},
  }
  Plotly.react(divId, traces, layout, {displaylogo: false})
}
