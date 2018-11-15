function prepTrendLineData(data) {
  ymdParser = d3.timeParse("%Y-%m-%d");
  records = []
  for (var i = 0; i < data.index.length; i++) {
    record = {op_date: ymdParser(data.index[i])}
    for (var j = 0; j < data.columns.length; j++) {
      record[data.columns[j]] = data.data[i][j]
    }
    records.push(record);
  }
  return records;
}

function drawMeanLine(g, data) {
  meanLine = d3.line()
    .defined(d => !isNaN(d.quartiles[1]))
    .x(d => x(d.x0))
    .y(d => y(d.quartiles[1]))
    .curve(d3.curveCatmullRom.alpha(0.3))
  g.append("path")
    .datum(data)
    .attr("stroke-width", 0.4)
    .attr("stroke-linejoin", "round")
    .attr("stroke", "#933")
    .attr("fill", "none")
    .attr("d", meanLine)
}

function drawIqrArea(g, data) {
  area = d3.area()
    .x(d => x(d.x0))
    .y0(d => y(d.range[0]))
    .y1(d => y(d.range[1]))
    .curve(d3.curveCatmullRom.alpha(0.3))
  g.append("path")
    .datum(data)
    .attr("fill", "#ccc")
    .attr("fill-opacity", 0.3)
    .attr("d", area)
}

function renderMonthlyGloadTrendLine(data, trendline_svg_id, margin) {
  data = prepTrendLineData(data)
  svg = d3.select(`#${trendline_svg_id}`)
  height = +svg.attr("height")
  width = +svg.attr("width")

  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  monExtent = d3.extent(data, d => d.op_date)
  startDate = d3.timeMonth.floor(monExtent[0])
  endDate = d3.timeMonth.ceil(monExtent[1])

  x = d3.scaleTime()
    .domain([startDate, endDate])
    .rangeRound([margin.left, width - margin.right])

  // TODO: Consider moving this math to the Python preproccessing step.
  bins = data.map(
    d => {
      const iqr = d.q3_gload - d.q1_gload; // interquartile range
      const r0 = Math.max(d.min_gload, d.q1_gload - iqr * 1.5);
      const r1 = Math.min(d.max_gload, d.q3_gload + iqr * 1.5);
      return {
        x0: d3.timeMonth.floor(d.op_date),
        x1: d3.timeMonth.ceil(d.op_date),
        quartiles: [d.q1_gload, d.q2_gload, d.q3_gload],
        range: [r0, r1]
      };
    })

  y = d3.scaleLinear()
    .domain([d3.min(bins, d => d.range[0]), d3.max(bins, d => d.range[1])]).nice()
    .range([height - margin.bottom, margin.top])

  const g = svg.append("g")
    .selectAll("g")
    .data(bins)
    .enter().append("g");

  drawIqrArea(g, bins)
  drawMeanLine(g, bins)

  // Add x-axis
  svg.append('g')
    .attr("transform", `translate(0, ${1 + height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add y-axis
  svg.append('g')
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));
}
