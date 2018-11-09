function onPageLoad() {
  d3.json("http://localhost:8000/web/data/overview/113.json")
    .then(
      d => renderMonthlyGloadBoxPlot(
        d.monthly_gload_quartiles,
        "monthly-boxplot",
        {top: 20, right: 30, bottom: 30, left: 40}))
  // render emissions time series next
}

$(document).ready(onPageLoad);
