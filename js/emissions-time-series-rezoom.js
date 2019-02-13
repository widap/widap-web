var DEFAULTS = require('./defaults.js')

const ZOOM_THRESHOLD_DAY_MS = 1.4e10
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const WEEK_FLOOR = d => d3.timeWeek.floor(d.datetime).getTime()
const DAY_FLOOR = d => d3.timeDay.floor(d.datetime).getTime()

const GAS_OPTIONS = {
  'so2_mass': {name: 'SO2 (lbs/hr)', color: 'green', yaxis: 'y'},
  'nox_mass': {name: 'NOx (lbs/hr)', color: 'orange', yaxis: 'y2'},
  'co2_mass': {name: 'CO2 (lbs/hr)', color: 'steelblue', yaxis: 'y3'}
}

const LAYOUT = {
  showlegend: false,
  autosize: true,
  font: DEFAULTS.STD_FONT,
  grid: {yaxes: ['y', 'y2', 'y3'], rows: 3, columns: 1},
  xaxis: {type: 'date'},
  yaxis: {fixedrange: true, title: {text: 'SO<sub>2</sub> (lbs/hr)'}},
  yaxis2: {fixedrange: true, title: {text: 'NO<sub>x</sub> (lbs/hr)'}},
  yaxis3: {fixedrange: true, title: {text: 'CO<sub>2</sub> (tons/hr)'}},
}

function groupByDate(coll, dateGrouper) {
   // Assumes coll is already sorted by date
  var bins = [], k = -1, binVal = new Date(0)
  for (var i = 0; i < coll.length; i++) {
    if (dateGrouper(coll[i]) != binVal) {
      binVal = dateGrouper(coll[i])
      k++
      bins.push([])
    }
    bins[k].push(coll[i])
  }
  return bins
}

function mean(xs, accessor) {
  const total = xs.map(accessor).reduce((a, b) => a + b)
  return total / xs.length
}

function filterTrace(trace, left, right) {
  // Plotly has a d3-based filter transform for this; however, i tried it out
  // and it was very slow (https://plot.ly/javascript/filter/).
  if (trace.x.length == 0) {
    return trace
  }
  var filtered = {}
  Object.keys(trace).forEach(k => filtered[k] = trace[k])
  filtered.x = [trace.x[0]], filtered.y = [trace.y[0]]
  for (var i = 1; i < trace.x.length - 1; i++) {
    if (left < trace.x[i] && trace.x[i] < right) {
      filtered.x.push(trace.x[i])
      filtered.y.push(trace.y[i])
    }
  }
  filtered.x.push(trace.x[trace.x.length - 1])
  filtered.y.push(trace.y[trace.y.length - 1])
  return filtered
}

function filterTraces(traces, left, right) {
  return traces.map(trace => filterTrace(trace, left, right))
}

function selectTrace(allTraces, timeDelta) {
  if (timeDelta > ZOOM_THRESHOLD_WEEK_MS) {
    return allTraces.weekly
  } else if (timeDelta > ZOOM_THRESHOLD_DAY_MS) {
    return allTraces.daily
  } else {
    return allTraces.hourly
  }
}

function selectAndFilterTraces(allTraces, timeStart, timeEnd) {
  const timeDelta = timeEnd.getTime() - timeStart.getTime()
  const left = new Date(timeStart.getTime() - timeDelta)
  const right = new Date(timeEnd.getTime() + timeDelta)
  const selected = selectTrace(allTraces, timeDelta)
  return filterTraces(selected, left, right)
}

function trendTraceGenerator(bins) {
  const dt = bins.map(bin => new Date(mean(bin, d => d.datetime.getTime())))
  return (gas) => {
    const sortedBins = bins.map(b => b.map(d => d[gas]).sort((a, b) => a - b))
    return (name, accessor, opts) => {
      const trace = {
        type: 'scatter',
        name: `${name} ${GAS_OPTIONS[gas].name}`,
        x: dt,
        y: sortedBins.map(accessor),
        yaxis: GAS_OPTIONS[gas].yaxis,
        hoverlabel: {font: DEFAULTS.STD_FONT},
      }
      return Object.assign(trace, opts)
    }
  }
}

function trendTraces(data, dateGrouper) {
  const bins = groupByDate(data, dateGrouper)
  const dt = bins.map(bin => new Date(mean(bin, d => d.datetime.getTime())))
  const traceMetaGenerator = trendTraceGenerator(bins)
  return Object.keys(GAS_OPTIONS).flatMap(gas => {
    const traceGen = traceMetaGenerator(gas)
    return [
      traceGen('min', b => b[0], {line: {color: '#CCC', width: 0.5}}),
      traceGen('max', b => b[b.length - 1], {line: {color: '#CCC', width: 0.5}, fill: 'tonexty'}),
      traceGen('25%', b => d3.quantile(b, 0.25), {line: {color: '#999', width: 0.5}}),
      traceGen('75%', b => d3.quantile(b, 0.75), {line: {color: '#999', width: 0.5}, fill: 'tonexty'}),
      traceGen('median', b => d3.quantile(b, 0.50), {line: {color: GAS_OPTIONS[gas].color, width: 1.8}}),
    ]
    })
}

function hourlyTraces(data) {
  return Object.keys(GAS_OPTIONS).map(gas => ({
    type: 'scatter',
    name: GAS_OPTIONS[gas].name,
    x: data.map(d => d.datetime),
    y: data.map(d => d[gas]),
    yaxis: GAS_OPTIONS[gas].yaxis,
    hoverlabel: {font: DEFAULTS.STD_FONT},
    line: {color: GAS_OPTIONS[gas].color, width: 1.5},
  }))
}

function rezoom(divId, allTraces, update) {
  const plot = update.currentTarget,
        xRange = plot.layout.xaxis.range,
        timeStart = new Date(xRange[0]),
        timeEnd = new Date(xRange[1])
  const traces = selectAndFilterTraces(allTraces, timeStart, timeEnd)
  Plotly.react(divId, traces, plot.layout)
}

module.exports = (divId, data) => {
  $(`#${divId}`).off('plotly_relayout')
  var traces = hourlyTraces(data)
  if (data.length > 0) {
    const allTraces = {
      weekly: trendTraces(data, WEEK_FLOOR),
      daily: trendTraces(data, DAY_FLOOR),
      hourly: traces,
    }
    traces = selectAndFilterTraces(
        allTraces, data[0].datetime, data[data.length - 1].datetime)
    $(`#${divId}`).on(
        'plotly_relayout', update => rezoom(divId, allTraces, update))
  }
  Plotly.react(divId, traces, LAYOUT, {displaylogo: false})
}
