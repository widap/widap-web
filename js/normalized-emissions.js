function prepEmissionsData(data) {
  ymdParser = d3.timeParse("%Y-%m-%d");
  startMonth = d3.timeMonth.floor(ymdParser(data.month_range[0]))
  stopMonth = d3.timeMonth.ceil(ymdParser(data.month_range[1]))
  monthRange = d3.timeMonth.range(startMonth, stopMonth)
  records = []
  gases = ["co2", "so2", "nox"]
  for (var i = 0; i < monthRange.length; i++) {
    records.push({
      month: monthRange[i],
      co2: data["co2_mass"][i],
      so2: data["so2_mass"][i],
      nox: data["nox_mass"][i],
    })
  }
  return records;
}

function drawEmissionsLine(g, data, gas, color) {
  emisLine = d3.line()
    .x(d => x(d.month))
    .y(d => y(d[gas]))
    .curve(d3.curveCatmullRom.alpha(0.5))
  g.append("path")
    .datum(data)
    .attr("stroke-width", 0.4)
    // .attr("stroke-linejoin", "round")
    .attr("stroke", color)
    .attr("fill", "none")
    .attr("d", emisLine)
}

function renderNormalizedEmissions(data, emissions_svg_id, margin) {
  data = prepEmissionsData(data)
  svg = d3.select(`#${emissions_svg_id}`)
  height = +svg.attr("height")
  width = +svg.attr("width")

  x = d3.scaleTime()
    .domain(d3.extent(data, d => d.month))
    .rangeRound([margin.left, width - margin.right])

  // TODO: Precompute y domain?
  y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d3.max([d.co2, d.so2, d.nox]))]).nice()
    .range([height - margin.bottom, margin.top])

  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  const g = svg.append("g")
    .selectAll("g")
    .data(data)
    .enter().append("g");

  drawEmissionsLine(g, data, "co2", "steelblue");
  drawEmissionsLine(g, data, "so2", "#c63");
  drawEmissionsLine(g, data, "nox", "#396");

  // Add x-axis
  svg.append('g')
    .attr("transform", `translate(0, ${1 + height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add y-axis
  svg.append('g')
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));
}