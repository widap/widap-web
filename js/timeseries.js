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

module.exports = {
  getMonthlyQuantiles: (data, col) => getQuantiles(data, col, MONTH_FLOOR),
  getWeeklyQuantiles: (data, col) => getQuantiles(data, col, WEEK_FLOOR),
  getDailyQuantiles: (data, col) => getQuantiles(data, col, DAY_FLOOR),
}
