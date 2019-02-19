const spin = require('./spin.js');
const renderGenerationTimeSeries = require('./generation-time-series.js');
const renderEmissionsTimeSeries = require('./emissions-time-series.js');
const React = require('react');
const ReactDOM = require('react-dom');
const PlantUnitSelector = require('./plant-unit-selector.js');

const GH_HOST = 'https://media.githubusercontent.com';
const EMIS_DATA_REPO =  `${GH_HOST}/media/widap/emissions-data/master/csv`;

const GENERATION_TIME_SERIES = 'generation-time-series'
const EMISSIONS_TIME_SERIES = 'emissions-time-series'
const SPINNER_DIV = 'loading-spinner'

const SPINNER_OPTS = {lines: 9, length: 5, width: 3, radius: 5};

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

function loadData(orisplCode, unitId) {
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
  clearPlots();
  ReactDOM.render(
    <PlantUnitSelector loadData={loadData} />,
    document.getElementById('plant-unit-selector'));
})
