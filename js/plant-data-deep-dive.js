function onPageLoad() {
  d3.csv("http://localhost:8000/dumps/cholla_113_unit_1.csv", cleanData)
    .then(d => renderMonthlyGloadBoxPlot(d, "monthly-gload-boxplot"))
  // render emissions time series next
}

function cleanData(row) {
  return {
    op_date: row.OP_DATE,
    gload: +row.GLOAD * +row.OP_TIME,
  }
}

$(document).ready(onPageLoad);
