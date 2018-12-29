function onPageLoad() {
  d3.csv("http://localhost:8000/dumps/cholla_113_unit_1.csv")
    .then(d => renderMonthlyGloadBoxPlot(d, "monthly-gload-boxplot"))
  // TODO: Do obvious preprocessing steps, e.g. ({carat, price}) => ({x: +carat, y: +price}))
  // render emissions time series next
}

$(document).ready(onPageLoad);
