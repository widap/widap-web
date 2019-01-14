function groupByMonth(xs) {
  return xs.reduce(function(rv, x) {
    (rv[x.op_date.slice(0, 7)] = rv[x.op_date.slice(0, 7)] || []).push(x);
    return rv;
  }, {});
};

function renderMonthlyGloadBoxPlot(data, boxplot_div_id) {
  byMonth = groupByMonth(data)

  traces = []
  for (var key in byMonth) {
    traces.push({
      y: byMonth[key].map(v => v.gload),
      name: key,
      type: 'box',
      line: {
        color: 'rgba(128,128,128,0.8)',
        width: 1.0,
      },
      fillcolor: 'rgba(128,128,140,0.3)',
      boxpoints: false,
    })
  }

  layout = {
    font: {
      family: "'Source Sans Pro', 'Open Sans', sans-serif",
    },
    showlegend: false,
    yaxis: {
      title: {
        text: 'Generation (MW)',
      },
    },
    xaxis: {
      title: {
        text: 'Date',
      },
      autorange: true,
      rangeslider: {},
      type: 'date',
    },
    margin: {
      l: 40,
      r: 10,
      t: 10,
      b: 10,
    }
  }

  Plotly.newPlot(boxplot_div_id, traces, layout, {displaylogo: false})
}
