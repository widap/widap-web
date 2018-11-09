function prepBoxplotData(data) {
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

function drawBoxes(g) {
  g.append("path")
    .attr("fill", "none")
    .attr("stroke-width", 0.4)
    .attr("stroke", "#336")
    .attr("d", d => `
      M${x(d.x0) + 1.5},${y(d.quartiles[2])}
      H${x(d.x1) - 0.5}
      V${y(d.quartiles[0])}
      H${x(d.x0) + 1.5}
      Z
    `);
}

function drawWhiskers(g) {
  g.append("path")
      .attr("stroke", "#336")
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.5)
      .attr("d", d => `
        M${(x(d.x0) + x(d.x1) + 1) / 2}, ${y(d.range[1])}
        V${y(d.quartiles[2])}
      `);
  g.append("path")
      .attr("stroke", "#336")
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.5)
      .attr("d", d => `
        M${(x(d.x0) + x(d.x1) + 1) / 2}, ${y(d.range[0])}
        V${y(d.quartiles[0])}
      `);
}

function drawMeans(g) {
  g.append("path")
    .attr("stroke", "#399")
    .attr("stroke-width", 1.8)
    .attr("d", d => `
      M${x(d.x0) + 1.5},${y(d.quartiles[1])}
      H${x(d.x1) - 0.5}
    `);
}

function renderMonthlyGloadBoxPlot(data, boxplot_svg_id, margin) {
  data = prepBoxplotData(data)
  svg = d3.select(`#${boxplot_svg_id}`)
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

  drawBoxes(g);
  drawWhiskers(g);
  drawMeans(g);

  // Add x-axis
  svg.append('g')
    .attr("transform", `translate(0, ${1 + height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add y-axis
  svg.append('g')
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));
}
