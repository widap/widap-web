function renderMonthlyAreaChart(data) {
  height = 400
  width = 1000
  margin = ({top: 20, right: 30, bottom: 30, left: 40})

  svg = d3.select("#area-chart-display-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  monExtent = d3.extent(data, d => d.op_date)
  startDate = d3.timeMonth.floor(monExtent[0])
  endDate = d3.timeMonth.ceil(monExtent[1])

  points = data.map(
    d => {
      return {
        x: d3.timeMonth.floor(d.op_date),
        y: d.q2_gload
      };
    })

  x = d3.scaleTime()
    .domain([startDate, endDate])
    .rangeRound([margin.left, width - margin.right])
  y = d3.scaleLinear()
    .domain(d3.extent(points, p => p.y))
    .range([height - margin.bottom, margin.top])

  area = d3.area()
    .x(d => x(d.x))
    .y0(y(0))
    .y1(d => y(d.y))

  svg.append("path")
    .datum(points)
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .attr("fill", "#eee")
    .attr("d", area)

  const g = svg.append("g")
    .selectAll("g")
    .data(points)
    .enter().append("g");

  // Add x-axis
  svg.append('g')
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Add y-axis
  svg.append('g')
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
}