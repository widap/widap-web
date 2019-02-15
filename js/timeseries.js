const MONTH_FLOOR = d => d3.timeMonth.floor(d.datetime).getTime()
const WEEK_FLOOR = d => d3.timeWeek.floor(d.datetime).getTime()
const DAY_FLOOR = d => d3.timeDay.floor(d.datetime).getTime()

function getQuantiles(data, col, dateGrouper) {
  if (data.length == 0) {
    return {range: null, iqr: null, median: null}
  }
  var bins = {}
  data.forEach(d => {
    const idx = dateGrouper(d)
    bins[idx] = bins[idx] || []
    bins[idx].push(d[col])
  })
  var range = [], iqr = [], median = []
  Object.keys(bins).forEach(
    idx => {
      const vals = bins[idx]
      vals.sort((a, b) => a - b)
      range.push([+idx, vals[0], vals[vals.length - 1]])
      iqr.push([+idx, d3.quantile(vals, 0.25), d3.quantile(vals, 0.75)])
      median.push([+idx, d3.quantile(vals, 0.5)])
    })
  return {range: range, iqr: iqr, median: median}
}

module.exports = {
  getMonthlyQuantiles: (data, col) => getQuantiles(data, col, MONTH_FLOOR),
  getWeeklyQuantiles: (data, col) => getQuantiles(data, col, WEEK_FLOOR),
  getDailyQuantiles: (data, col) => getQuantiles(data, col, DAY_FLOOR),
}
