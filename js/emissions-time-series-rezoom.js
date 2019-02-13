const ZOOM_THRESHOLD_DAY_MS = 1.5e10
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
  font: {family: STD_FONT_FAMILY},
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

function filterTraces(traces, left, right) {
  // TODO: Use Plotly's d3-based filter transforms for this!
  // See: https://plot.ly/javascript/filter/
  return traces.map(trace => {
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
  })
}

function selectAndFilterTraces(allTraces, timeStart, timeEnd) {
  const timeDelta = timeEnd.getTime() - timeStart.getTime()
  const left = new Date(timeStart.getTime() - timeDelta)
  const right = new Date(timeEnd.getTime() + timeDelta)
  if (timeDelta > ZOOM_THRESHOLD_WEEK_MS) {
    return filterTraces(allTraces.weekly, left, right)
  } else if (timeDelta > ZOOM_THRESHOLD_DAY_MS) {
    return filterTraces(allTraces.daily, left, right)
  } else {
    return filterTraces(allTraces.hourly, left, right)
  }
}

function trendTraces(data, dateGrouper) {
  const bins = groupByDate(data, dateGrouper)
  const dt = bins.map(bin => new Date(mean(bin, d => d.datetime.getTime())))
  var traces = []
  // TODO: Massive refactoring
  Object.keys(GAS_OPTIONS).forEach(gas => {
    const sortedBins = bins.map(b => b.map(d => d[gas]).sort((a, b) => a - b))
    // min
    traces.push({
      type: 'scatter',
      name: `min ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: sortedBins.map(bin => bin[0]),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: '#CCC', width: 0.5},
    })
    // max
    traces.push({
      type: 'scatter',
      name: `max ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: sortedBins.map(bin => bin[bin.length - 1]),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: '#CCC', width: 0.5},
      fill: 'tonexty',
    })
    // q1
    traces.push({
      type: 'scatter',
      name: `25% ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: sortedBins.map(bin => d3.quantile(bin, 0.25)),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: '#999', width: 0.5},
    })
    // q3
    traces.push({
      type: 'scatter',
      name: `75% ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: sortedBins.map(bin => d3.quantile(bin, 0.75)),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: '#999', width: 0.5},
      fill: 'tonexty',
    })
    // median
    traces.push({
      type: 'scatter',
      name: `median ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: sortedBins.map(bin => d3.quantile(bin, 0.50)),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: GAS_OPTIONS[gas].color, width: 1.8},
    })
  })
  return traces
}

function hourlyTraces(data) {
  return Object.keys(GAS_OPTIONS).map(gas => ({
    type: 'scatter',
    name: GAS_OPTIONS[gas].name,
    x: data.map(d => d.datetime),
    y: data.map(d => d[gas]),
    yaxis: GAS_OPTIONS[gas].yaxis,
    hoverlabel: {font: {family: STD_FONT_FAMILY}},
    line: {color: GAS_OPTIONS[gas].color, width: 1.5},
  }))
}

function rezoomEmissionsTimeSeries(divId, allTraces, update) {
  const plot = update.currentTarget,
        xRange = plot.layout.xaxis.range,
        timeStart = new Date(xRange[0]),
        timeEnd = new Date(xRange[1])
  const traces = selectAndFilterTraces(allTraces, timeStart, timeEnd)
  Plotly.react(divId, traces, plot.layout)
}

function renderEmissionsTimeSeries(divId, data) {
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
        'plotly_relayout',
        update => rezoomEmissionsTimeSeries(divId, allTraces, update))
  }
  Plotly.react(divId, traces, LAYOUT, {displaylogo: false})
}
