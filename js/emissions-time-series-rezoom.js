const ZOOM_THRESHOLD_DAY_MS = 1.5e10
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const WEEK_FLOOR = d => d3.timeWeek.floor(d.datetime).getTime()
const DAY_FLOOR = d => d3.timeDay.floor(d.datetime).getTime()

function mean(xs, accessor) {
  const total = xs.map(accessor).reduce((a, b) => a + b)
  return total / xs.length
}

function computeMeanOverTime(data, groupingFn) {
  // This only works if data is already sorted WRT groupingFn!
  var bins = [], k = -1, binVal = new Date(0)
  for (var i = 0; i < data.length; i++) {
    if (groupingFn(data[i]) != binVal) {
      binVal = groupingFn(data[i])
      k++
      bins.push([])
    }
    bins[k].push(data[i])
  }
  var agg = []
  for (var i = 0; i < bins.length; i++) {
    agg.push({
      datetime: new Date(mean(bins[i], d => d.datetime.getTime())),
      so2_mass: mean(bins[i], d => d.so2_mass),
      nox_mass: mean(bins[i], d => d.nox_mass),
      co2_mass: mean(bins[i], d => d.co2_mass),
    })
  }
  return agg
}

function attachEndpoints(original, filtered) {
  return [original[0]].concat(filtered).concat(original[original.length - 1])
}

function computeDisplayAverage(data, timeStart, timeEnd) {
  const timeDelta = timeEnd.getTime() - timeStart.getTime()
  const left = new Date(timeStart.getTime() - timeDelta)
  const right = new Date(timeEnd.getTime() + timeDelta)
  const inRange = data.slice(1, data.length - 1)
    .filter(d => left < d.datetime && d.datetime < right)
  if (timeDelta > ZOOM_THRESHOLD_WEEK_MS) {
    // Above this threshold, use weekly averages
    return attachEndpoints(data, computeMeanOverTime(inRange, WEEK_FLOOR))
  } else if (timeDelta > ZOOM_THRESHOLD_DAY_MS) {
    // Otherwise, above this threshold, use daily averages
    return attachEndpoints(data, computeMeanOverTime(inRange, DAY_FLOOR))
  } else {
    // Otherwise, use hourly data
    return attachEndpoints(data, inRange)
  }
}

function newTrace(data, opts) {
  return {
      type: 'scatter',
      name: opts.name,
      x: data.map(d => d.datetime),
      y: data.map(d => d[opts.col]),
      yaxis: opts.yax,
      hoverlabel: {font: {family: STD_FONT_FAMILY}},
      line: {color: opts.color, width: 1.5},
  }
}

var newYAxis = titleText => ({fixedrange: true, title: {text: titleText}})

function renderEmissionsTimeSeries(divId, data) {
  var filtered = []
  if (data.length > 0) {
    filtered = computeDisplayAverage(data, data[0].datetime, data[data.length - 1].datetime)
  }
  const traces = [
      {name: 'SO2 (lbs/hr)', col: 'so2_mass', color: 'green', yax: 'y'},
      {name: 'NOx (lbs/hr)', col: 'nox_mass', color: 'xkcd:orange', yax: 'y2'},
      {name: 'CO2 (lbs/hr)', col: 'co2_mass', color: 'steelblue', yax: 'y3'},
  ].map(opts => newTrace(filtered, opts))
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
    yaxis: newYAxis('SO<sub>2</sub> (lbs/hr)'),
    yaxis2: newYAxis('NO<sub>x</sub> (lbs/hr)'),
    yaxis3: newYAxis('CO<sub>2</sub> (tons/hr)'),
  }
  Plotly.react(divId, traces, layout, {displaylogo: false})
}

function rezoomEmissionsTimeSeries(divId, update) {
  const plot = update.currentTarget,
        xRange = plot.layout.xaxis.range,
        timeStart = new Date(xRange[0]),
        timeEnd = new Date(xRange[1])
  const filtered = computeDisplayAverage(GLOBAL_DATA_VERY_BAD, timeStart, timeEnd)
  const cols = ['so2_mass', 'nox_mass', 'co2_mass']
  for (var i = 0; i < cols.length; i++) {
    plot.data[i].x = filtered.map(d => d.datetime)
    plot.data[i].y = filtered.map(d => d[cols[i]])
  }
  Plotly.react(divId, plot.data, plot.layout)
}
