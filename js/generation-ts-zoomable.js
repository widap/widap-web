const COLORS = require('./colors.js')
const DEFAULTS = require('./defaults.js')

const ZOOM_THRESHOLD_DAY_MS = 6e9
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const ZOOM_THRESHOLD_MONTH_MS = 30 * ZOOM_THRESHOLD_DAY_MS

const MONTH_FLOOR = d => d3.timeMonth.floor(d.datetime).getTime()
const WEEK_FLOOR = d => d3.timeWeek.floor(d.datetime).getTime()
const DAY_FLOOR = d => d3.timeDay.floor(d.datetime).getTime()

function getQuantiles(data, col, dateGrouper) {
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

function hourlySeries(hourlyData) {
  return [{
    name: 'generation',
    data: hourlyData,
    color: COLORS.CARDINAL,
    lineWidth: 1.5,
    zIndex: 1,
  }]
}

function trendSeries(quantiles) {
  return [
    {
      name: 'median',
      type: 'line',
      data: quantiles.median,
      color: COLORS.CARDINAL,
      zIndex: 1,
      marker: {enabled: false},
    },
    {
      name: '25%-75%',
      data: quantiles.iqr,
      zIndex: 0.5,
      type: 'arearange',
      linkedTo: ':previous',
      color: COLORS.GRAY,
      fillOpacity: 0.6,
      marker: {enabled: false},
    },
    {
      name: 'range',
      data: quantiles.range,
      type: 'arearange',
      lineWidth: 0,
      linkedTo: ':previous',
      color: COLORS.LIGHT_GRAY,
      fillOpacity: 0.4,
      zIndex: 0,
      marker: {enabled: false},
    },
  ]
}

function selectSeries(quantiles, hourlyData, tDelta) {
  if (tDelta > ZOOM_THRESHOLD_MONTH_MS) {
    return {zoomLevel: 'monthly', data: trendSeries(quantiles.monthly)}
  } else if (tDelta > ZOOM_THRESHOLD_WEEK_MS) {
    return {zoomLevel: 'weekly', data: trendSeries(quantiles.weekly)}
  } else if (tDelta > ZOOM_THRESHOLD_DAY_MS) {
    return {zoomLevel: 'daily', data: trendSeries(quantiles.daily)}
  } else {
    return {zoomLevel: 'hourly', data: hourlySeries(hourlyData)}
  }
}

function onZoom(quantiles, hourlyData) {
  return e => {
    const chart = e.target.chart
    const seriesSpec = selectSeries(quantiles, hourlyData, e.max - e.min)
    if (seriesSpec.zoomLevel != chart.subtitle.textStr) {
      while(chart.series.length > 0) {
        chart.series[0].remove(false)
      }
      seriesSpec.data.forEach(s => chart.addSeries(s))
      chart.setTitle({}, {text: seriesSpec.zoomLevel}, true)
    }
  }
}

function renderGenerationTimeSeries(divId, data) {
  const quantiles = {
    monthly: getQuantiles(data, 'gen', MONTH_FLOOR),
    weekly: getQuantiles(data, 'gen', WEEK_FLOOR),
    daily: getQuantiles(data, 'gen', DAY_FLOOR),
  }
  const hourlyData = data.map(d => [d.datetime, d.gen])
  var series = {}
  if (data.length > 0) {
    const tDelta = data[data.length-1].datetime - data[0].datetime
    series = selectSeries(quantiles, hourlyData, tDelta)
  }
  const chartOpts = {
    chart: {
      style: {fontFamily: DEFAULTS.STD_FONT_FAMILY},
    },
    title: {text: 'Gross generation time series'},
    subtitle: {text: series ? series.zoomLevel : ''},
    xAxis: {
      type: 'datetime',
      events: {
        afterSetExtremes: onZoom(quantiles, hourlyData),
      },
    },
    yAxis: {
      title: {text: 'Generation (MWh)'},
      min: 0,
    },
    rangeSelector: {
      allButtonsEnabled: true,
       buttons: [
        {type: 'day', count: 3, text: '3d'},
        {type: 'month', count: 1, text: '1m'},
        {type: 'year', count: 1, text: '1y'},
        {type: 'all', text: 'All'},
      ],
      selected: 3,
    },
    tooltip: {
      crosshairs: true,
      shared: true,
      valueSuffix: 'MWh',
    },
    plotOptions: {series: {animation: false}},
    legend: {enabled: false},
    credits: false,
  }
  const tsData = [{
    name: 'gen',
    data: data.slice(0, 5000).map(d => [d.datetime, d.gen]),
    color: COLORS.CARDINAL,
    tooltip: {
      valueDecimals: 2,
      valueSuffix: 'MWh',
    },
  }]
  Highcharts.stockChart(divId, Object.assign({series: series.data}, chartOpts))
}

module.exports = renderGenerationTimeSeries
