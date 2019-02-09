const HOST = "http://localhost:8080"
const YMD_PARSER = d3.timeParse('%Y-%m-%d %H:%M:%S')

var plantsUnits = {}

function htmlOption(label, value) {
  return `<option label="${label}" value="${value}"></option>`
}

function addPlant(row) {
  plantsUnits[row.orispl_code] = {
    name: row.name,
    unitIds: row.unit_ids.split('/')
  }
  $('#plant-selector').append(htmlOption(row.name, row.orispl_code))
}

function updateUnitOptions() {
  $('#unit-selector').empty()
  plantsUnits[$('#plant-selector').val()].unitIds.forEach(
    unitId => {
      const cleaned = unitId.replace('*', '')
      $('#unit-selector').append(htmlOption(cleaned, cleaned))
    })
}

function clearPlots() {
  console.log('Clearing plots')
}

function plot(data) {
  renderMonthlyGloadTrendPlot(data);
}

function parseTimeSeriesRow(row) {
  return {
    datetime: YMD_PARSER(row.datetime),
    gen: +row.gen,
    co2_mass: +row.co2_mass,
    so2_mass: +row.so2_mass,
    nox_mass: +row.nox_mass,
    heat_input: +row.heat_input,
  }
}

function loadData() {
  const orisplCode = $('#plant-selector').val()
  const unitId = $('#unit-selector').val()
  if (orisplCode && unitId) {
    clearPlots();
    const dataUri = `${HOST}/dumps/${orisplCode}_${unitId}.csv`
    d3.csv(dataUri, parseTimeSeriesRow).then(plot)
  }
}

$(document).ready(function() {
  renderMonthlyGloadTrendPlot([])
  d3.csv(`${HOST}/web/csv/plants_overview.csv`)
    .then(d => d.forEach(addPlant))
  $('#plant-selector').change(updateUnitOptions)
  $('#load-plant-unit-data-button').click(loadData)
})
