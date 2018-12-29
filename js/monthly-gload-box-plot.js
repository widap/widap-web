function prepGloadData(data) {
  ymdParser = d3.timeParse("%Y-%m-%d");
  records = []
  for (var i = 0; i < data.length; i++) {
    records.push({
      op_date: ymdParser(data[i].OP_DATE),
      gload: parseFloat(data[i].GLOAD) * parseFloat(data[i].OP_TIME),
    });
  }
  return records;
}

function renderMonthlyGloadBoxPlot(data, boxplot_div_id) {
  data = prepGloadData(data)


  monExtent = d3.extent(data, d => d.op_date)
  startDate = d3.timeMonth.floor(monExtent[0])
  endDate = d3.timeMonth.ceil(monExtent[1])
  monRange = d3.timeMonths(d3.timeMonth.ceil(monExtent[0]), endDate)

  bins = d3.histogram()
    .domain([startDate, endDate])
    .value(d => d.op_date)
    .thresholds(monRange)
    (data)

  byMonth = []
  for (i = 0; i < bins.length; i++) {
    y = []
    for (j = 0; j < bins[i].length; j++) {
      y.push(bins[i][j].gload)
    }
    thisMonth = d3.timeMonth.floor(bins[i].x0)
    dateFmtOptions = {year: 'numeric', month: 'short'}
    byMonth.push({
      y: y,
      name: thisMonth.toLocaleDateString('en-US', dateFmtOptions),
      type: 'box',
      line: {
        color: 'rgba(128,128,128,0.8)',
        width: 1.0,
      },
      fillcolor: 'rgba(128,128,140,0.3)',
      boxpoints: false,
      // hoverinfo: 'none',
    })
  }

  layout = {
    font: "'Source Sans Pro', 'Open Sans', sans-serif",
    showlegend: false,
    yaxis: {
      title: {
        text: 'Generation (MW)',
      },
    },
    xaxis: {
      autorange: true,
      rangeslider: {range: ['Jan 2001', 'Apr 2018']},
    },
    margin: {
      l: 40,
      r: 10,
      t: 10,
      b: 10,
    }
  }

  Plotly.newPlot(boxplot_div_id, byMonth, layout, {displaylogo: false})
}
