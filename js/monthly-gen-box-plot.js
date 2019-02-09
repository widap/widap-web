function renderMonthlyGenBoxPlot(divId, data) {
  const dt = data.map(d => d.year_month)
  const minTrace = {
    type: 'scatter',
    name: 'min',
    x: dt,
    y: data.map(d => d.min_gload_mw),
    line: {
      color: '#CCC',
      width: 0.5,
    },
  }
  const maxTrace = {
    type: 'scatter',
    name: 'max',
    x: dt,
    y: data.map(d => d.max_gload_mw),
    line: {
      color: '#CCC',
      width: 0.5,
    },
    fill: 'tonexty',
  }
  const q1Trace = {
    type: 'scatter',
    name: '25%',
    x: dt,
    y: data.map(d => d.q1_gload_mw),
    line: {
      color: '#999',
      width: 0.5,
    },
  }
  const q3Trace = {
    type: 'scatter',
    name: '75%',
    x: dt,
    y: data.map(d => d.q3_gload_mw),
    line: {
      color: '#999',
      width: 0.5,
    },
    fill: 'tonexty',
  }
  const q2Trace = {
    type: 'scatter',
    name: 'median',
    x: dt,
    y: data.map(d => d.q2_gload_mw),
    line: {
      color: 'steelblue',
      width: 1.8,
    },
  }
  const layout = {
    showlegend: false,
    height: 360,
    paper_bgcolor: 'rgba(255,255,255,0.1)',
    plot_bgcolor: 'rgba(255,255,255,0.1)',
    font: {
      family: "'Source Sans Pro', 'Open Sans', sans-serif",
    },
    xaxis: {
      rangeslider: {},
      type: 'date',
      tickformat: '%b %Y',
    },
    yaxis: {
      title: {
        text: 'Gross load (MW)',
      },
    },
    margin: {
      l: 50,
      r: 20,
      t: 10,
      b: 10,
    },
  }
  Plotly.plot(
    divId,
    [minTrace, maxTrace, q1Trace, q3Trace, q2Trace],
    layout,
    {displayModeBar: false});
}
