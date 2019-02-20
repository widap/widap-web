const Plotly = require('plotly.js-basic-dist');
const DEFAULTS = require('./defaults.js');

function newTraceGenerator(data) {
  const dt = data.map(d => d.year_month)
  return (name, accessor, line, opts) => Object.assign(
      {type: 'scatter', name: name, x: dt, y: data.map(accessor), line: line},
      opts)
}

module.exports = (divId, data) => {
  const traceGen = newTraceGenerator(data)
  const traces = [
    traceGen('SO2 (lbs/hr)', d => d.avg_so2_mass_lbs_hr, {color: 'green', width: 1.5}, {}),
    traceGen('NOx (lbs/hr)', d => d.avg_nox_mass_lbs_hr, {color: 'xkcd:orange', width: 1.5}, {yaxis: 'y2'}),
    traceGen('CO2 (tons/hr)', d => d.avg_co2_mass_tons_hr, {color: 'steelblue', width: 1.5}, {yaxis: 'y3'}),
  ]
  const layout = {
    height: 360,
    paper_bgcolor: 'rgba(255,255,255,0.1)',
    plot_bgcolor: 'rgba(255,255,255,0.1)',
    xaxis: {
      rangeslider: {},
      type: 'date',
      tickformat: '%b %Y',
    },
    yaxis: {
      fixedrange: true,
      title: {text: 'SO<sub>2</sub> (lbs/hr)'},
    },
    yaxis2: {
      fixedrange: true,
      title: {text: 'NO<sub>x</sub> (lbs/hr)'},
    },
    yaxis3: {
      fixedrange: true,
      title: {text: 'CO<sub>2</sub> (tons/hr)'},
    },
    margin: {l: 50, r: 10, t: 10, b: 10},
    showlegend: false,
    font: DEFAULTS.FONT,
    grid: {
      yaxes: ['y', 'y2', 'y3'],
      rows: 3,
      columns: 1,
    },
  }
  Plotly.react(divId, traces, layout, {displayModeBar: false});
}
