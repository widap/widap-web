const spin = require('./spin.js')
const plantsUnits = require('./plants-units.js')
const renderGenerationTimeSeries = require('./generation-time-series.js')
const renderEmissionsTimeSeries = require('./emissions-time-series.js')
const GH_HOST = 'https://media.githubusercontent.com';
const EMIS_DATA_REPO =  `${GH_HOST}/media/widap/emissions-data/master/csv`;

// TODO: Find a way to coordinate div id's between JS and HTML
const GENERATION_TIME_SERIES = 'generation-time-series'
const EMISSIONS_TIME_SERIES = 'emissions-time-series'
const SPINNER_DIV = 'loading-spinner'

const SPINNER_OPTS = {lines: 9, length: 5, width: 3, radius: 5};

const PLANT_UNIT_MAP = loadPlantsUnits(plantsUnits.PLANTS_UNITS);
const PLANT_OPTIONS = plantsUnits.PLANTS_UNITS.map(
    row => htmlOption(row.name, row.orispl_code));

function loadPlantsUnits(rows) {
  var plantsUnits = {};
  rows.forEach(row => plantsUnits[row.orispl_code] = {
    name: row.name,
    unitIds: row.unit_ids,
  });
  return plantsUnits;
}

function htmlOption(label, value) {
  return `<option label="${label}" value="${value}"></option>`
}


function updateUnitOptions() {
  $('#unit-selector').empty();
  PLANT_UNIT_MAP[$('#plant-selector').val()].unitIds.forEach(
      unitId => $('#unit-selector').append(htmlOption(unitId, unitId)));
}

function clearPlots() {
  updatePlots([])
}

function updatePlots(data) {
  renderGenerationTimeSeries(GENERATION_TIME_SERIES, data);
  renderEmissionsTimeSeries(EMISSIONS_TIME_SERIES, data);
}

function parseTimeSeriesRow(row) {
  return {
    datetime: new Date(row.datetime),
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
    var spinner = new spin.Spinner(SPINNER_OPTS);
    spinner.spin(document.getElementById(SPINNER_DIV));
    clearPlots();
    const sanitizedUnitId = unitId.replace('*', '')
    const dataUri = `${EMIS_DATA_REPO}/${orisplCode}_${sanitizedUnitId}.csv`
    d3.csv(dataUri, parseTimeSeriesRow).then(data => {
      updatePlots(data);
      spinner.stop();
    });
  }
}

$(document).ready(function() {
  clearPlots()
  PLANT_OPTIONS.forEach(option => $('#plant-selector').append(option));
  $('#plant-selector').change(e => updateUnitOptions())
  $('#load-plant-unit-data-button').click(loadData)
})
