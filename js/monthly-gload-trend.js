const DEFAULTS = require('./defaults.js')

function newTraceGenerator(data) {
  const dt = data.map(d => d.year_month)
  return (name, accessor, opts) => Object.assign(
      {type: 'scatter', name: name, x: dt, y: data.map(accessor)},
      opts)
}

module.exports = (divId, data) => {
  const traceGen = newTraceGenerator(data)
  const traces = [
    traceGen('min', d => d.min_gload_mw, {line: {color: '#CCC', width: 0.5}}),
    traceGen('max', d => d.max_gload_mw, {line: {color: '#CCC', width: 0.5}, fill: 'tonexty'}),
    traceGen('25%', d => d.q1_gload_mw, {line: {color: '#999', width: 0.5}}),
    traceGen('75%', d => d.q3_gload_mw, {line: {color: '#999', width: 0.5}, fill: 'tonexty'}),
    traceGen('median', d => d.q2_gload_mw, {line: {color: 'steelblue', width: 1.8}}),
  ]
  const layout = {
    showlegend: false,
    height: 360,
    paper_bgcolor: 'rgba(255,255,255,0.1)',
    plot_bgcolor: 'rgba(255,255,255,0.1)',
    font: DEFAULTS.FONT,
    xaxis: {
      rangeslider: {},
      type: 'date',
      tickformat: '%b %Y',
    },
    yaxis: {
      title: {
        text: 'Gross load (MW)',
      },
    },
    margin: {l: 50, r: 20, t: 10, b: 10},
  }
  Plotly.react(divId, traces, layout, {displayModeBar: false});
}
