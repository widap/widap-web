const ZOOM_THRESHOLD_DAY_MS = 1.4e10
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const ZOOM_THRESHOLD_MONTH_MS = 30 * ZOOM_THRESHOLD_DAY_MS

const MONTH_FLOOR = d => d3.timeMonth.floor(d.datetime).getTime()
const WEEK_FLOOR = d => d3.timeWeek.floor(d.datetime).getTime()
const DAY_FLOOR = d => d3.timeDay.floor(d.datetime).getTime()

function getQuantiles(data, col, dateGrouper) {
  if (data.length == 0) {
    return []
  }
  var bins = {}
  data.forEach(d => {
    const idx = dateGrouper(d)
    bins[idx] = bins[idx] || []
    bins[idx].push(d[col])
  })
  return Object.keys(bins).map(
    idx => {
      const vals = bins[idx]
      vals.sort((a, b) => a - b)
      return {
        t: +idx,
        min: vals[0],
        q1: d3.quantile(vals, 0.25),
        q2: d3.quantile(vals, 0.5),
        q3: d3.quantile(vals, 0.75),
        max: vals[vals.length - 1],
      }
    })
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

function selectTrace(allTraces, timeDelta) {
  if (timeDelta > ZOOM_THRESHOLD_MONTH_MS)
    return allTraces.monthly
  if (timeDelta > ZOOM_THRESHOLD_WEEK_MS)
    return allTraces.weekly
  if (timeDelta > ZOOM_THRESHOLD_DAY_MS)
    return allTraces.daily
  return allTraces.hourly
}

function selectAndFilterTraces(allTraces, timeStart, timeEnd) {
  const timeDelta = timeEnd.getTime() - timeStart.getTime()
  const left = new Date(timeStart.getTime() - timeDelta)
  const right = new Date(timeEnd.getTime() + timeDelta)
  const selected = selectTrace(allTraces, timeDelta)
  return selected.map(trace => filterTrace(trace, left, right))
}

function rezoom(divId, allTraces) {
  return (update) => {
    const plot = update.currentTarget,
          xRange = plot.layout.xaxis.range,
          timeStart = new Date(xRange[0]),
          timeEnd = new Date(xRange[1])
    const traces = selectAndFilterTraces(allTraces, timeStart, timeEnd)
    Plotly.react(divId, traces, plot.layout)
  }
}

module.exports = {
  getMonthlyQuantiles: (data, col) => getQuantiles(data, col, MONTH_FLOOR),
  getWeeklyQuantiles: (data, col) => getQuantiles(data, col, WEEK_FLOOR),
  getDailyQuantiles: (data, col) => getQuantiles(data, col, DAY_FLOOR),
  rezoom: rezoom,
}
