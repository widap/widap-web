const STD_FONT_FAMILY = "'Source Sans Pro', 'Open Sans', sans-serif"
const STD_MARGIN = {l: 60, r: 30, t: 40, b: 30}
const YEAR_MONTH_FMT = d3.timeFormat('%Y-%m')

function renderMonthlyGloadTrendPlot(data) {
  var byYearMonth = {}
  data.forEach(d => {
    const yearMonth = YEAR_MONTH_FMT(d.datetime)
    if (!byYearMonth[yearMonth]) {
      byYearMonth[yearMonth] = []
    }
    byYearMonth[yearMonth].push(d.gen)
  })
  const boxes = Object.keys(byYearMonth).map(
    yearMonth => {
      return {
        y: byYearMonth[yearMonth],
        type: 'box',
        name: yearMonth,
        boxpoints: false,
        marker: {color: 'rgba(90, 110, 152, 0.8)'},
        line: {
          color: 'rgba(90, 110, 152, 0.8)',
          width: 0.9,
        },
        fillcolor: 'rgba(240, 240, 240, 0.9)',
        whiskerwidth: 0.8,
        hoverlabel: {
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          bordercolor: 'rgb(90, 110, 152)',
          font: {
            color: 'rgb(90, 110, 152)',
            family: STD_FONT_FAMILY,
          },
        },
      }
    })
  const layout = {
    showlegend: false,
    xaxis: {
      title: 'Date',
      type: 'date',
      tickformat: '%b %Y',
    },
    title: {text: 'Monthly gross generation box plot'},
    yaxis: {
      fixedrange: true,
      title: {text: 'Gross load (MW)'},
    },
    font: {family: STD_FONT_FAMILY},
    margin: STD_MARGIN,
  }
  Plotly.plot('monthly-generation-box-plot', boxes, layout, {displaylogo: false});
}
