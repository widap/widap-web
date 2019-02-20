const Plotly = require('plotly.js-basic-dist');
const DEFAULTS = require('./defaults.js')
const TS = require('./timeseries.js')

const LAYOUT = {
  showlegend: false,
  autosize: true,
  title: {text: 'Generation time series'},
  font: DEFAULTS.FONT,
  xaxis: {title: 'Date', type: 'date'},
  yaxis: {fixedrange: true, title: {text: 'Generation (MWh)'}},
}

function newTrace(bins, name, dt, accessor, opts) {
  const trace = {
    type: 'scatter',
    name: `${name} gen (MWh)`,
    x: dt,
    y: bins.map(accessor),
    hoverlabel: {font: DEFAULTS.FONT},
  }
  return Object.assign(trace, opts)
}

function trendTraces(bins) {
  const dt = bins.map(bin => bin.t)
  return [
    newTrace(bins, 'min', dt, d => d.min, {line: {color: '#CCC', width: 0.5}}),
    newTrace(bins, 'max', dt, d => d.max, {line: {color: '#CCC', width: 0.5}, fill: 'tonexty'}),
    newTrace(bins, '25%', dt, d => d.q1, {line: {color: '#999', width: 0.5}}),
    newTrace(bins, '75%', dt, d => d.q3, {line: {color: '#999', width: 0.5}, fill: 'tonexty'}),
    newTrace(bins, 'median', dt, d => d.q2, {line: {color: 'darkred', width: 1.8}}),
  ]
}

function hourlyTraces(data) {
  return [{
    type: 'scatter',
    name: 'generation (MWh)',
    x: data.map(d => d.datetime),
    y: data.map(d => d.gen),
    hoverlabel: {font: DEFAULTS.FONT},
    line: {color: 'darkred', width: 1.5},
  }]
}

function renderGenerationTimeSeries(divId, data) {
  $(`#${divId}`).off('plotly_relayout')
  const quantiles = {
    monthly: TS.getMonthlyQuantiles(data, 'gen'),
    weekly: TS.getWeeklyQuantiles(data, 'gen'),
    daily: TS.getDailyQuantiles(data, 'gen'),
  }
  var traces = hourlyTraces(data)
  if (data.length > 0) {
    const allTraces = {
      monthly: trendTraces(quantiles.monthly),
      weekly: trendTraces(quantiles.weekly),
      daily: trendTraces(quantiles.daily),
      hourly: traces,
    }
    $(`#${divId}`).on('plotly_relayout', TS.rezoom(divId, allTraces))
    Plotly.react(divId, allTraces.monthly, LAYOUT, {displaylogo: false})
    Plotly.relayout(divId, {})
  } else {
    Plotly.react(divId, traces, LAYOUT, {displaylogo: false})
  }
}

module.exports = renderGenerationTimeSeries
