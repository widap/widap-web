import { Spinner } from './spin.js';
import { renderGenerationTimeSeries } from './generation-time-series.js';
import { renderEmissionsTimeSeries } from './emissions-time-series.js';
import React from 'react';
import Select from 'react-select';
import ReactDOM from 'react-dom';
import PLANTS_UNITS from './plants-units.js';
import { csv } from 'd3-fetch';

const PLANT_UNIT_MAP = loadPlantsUnits(PLANTS_UNITS);
const PLANT_OPTIONS = PLANTS_UNITS.map(
  row => ({label: row.name, value: row.orispl_code}));

const GH_HOST = 'https://media.githubusercontent.com';
const EMIS_DATA_REPO =  `${GH_HOST}/media/widap/emissions-data/master/csv`;

const GENERATION_TIME_SERIES = 'generation-time-series'
const EMISSIONS_TIME_SERIES = 'emissions-time-series'
const SPINNER_DIV = 'loading-spinner'
const SPINNER_OPTS = {lines: 9, length: 5, width: 3, radius: 5};

function loadPlantsUnits(rows) {
  var plantsUnits = {};
  rows.forEach(row => plantsUnits[row.orispl_code] = {
    name: row.name,
    unitIds: row.unit_ids,
  });
  return plantsUnits;
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
  const sanitizedUnitId = unitId.replace('*', '');
  const dataUri = `${EMIS_DATA_REPO}/${orisplCode}_${sanitizedUnitId}.csv`;
  return csv(dataUri, parseTimeSeriesRow);
}

class DashboardControl extends React.Component {
  state = {
    selectedPlant: null,
    unitOpts: [],
    selectedUnit: null,
    loadedPlant: null,
    loadedUnit: null,
  };
  spinner = new Spinner(SPINNER_OPTS);

  clearPlots = () => {
    this.updatePlots([])
  }

  updatePlots = (data) => {
    renderGenerationTimeSeries(GENERATION_TIME_SERIES, data);
    renderEmissionsTimeSeries(EMISSIONS_TIME_SERIES, data);
  }

  componentDidMount() {
    this.clearPlots();
  }

  handlePlantChange = (selected) => {
    if (selected !== this.state.selectedPlant) {
      this.setState({selectedPlant: selected, selectedUnit: null});
      if (selected != null && PLANT_UNIT_MAP[selected.value]) {
        const unitIds = PLANT_UNIT_MAP[selected.value].unitIds;
        this.setState({unitOpts: unitIds.map(u => ({label: u, value: u}))});
      }
    }
  }

  handleUnitChange = (selected) => {
    this.setState({ selectedUnit: selected });
  }

  maybeLoadData = (e) => {
    const plant = this.state.selectedPlant, unit = this.state.selectedUnit;
    if (plant != null && unit != null) {
      if (plant.value != this.state.loadedPlant || unit.value != this.state.loadedUnit) {
        this.spinner.spin(document.getElementById(SPINNER_DIV));
        this.clearPlots();
        this.setState({loadedPlant: plant.value, loadedUnit: unit.value});
        loadData(plant.value, unit.value).then(data => {
          this.updatePlots(data);
          this.spinner.stop();
        });
      }
    }
  }

  render() {
    return (
      <div className='flex-row'>
        <Select
          id='plant-selector'
          value={this.state.selectedPlant}
          onChange={this.handlePlantChange}
          options={PLANT_OPTIONS}
          className='selector'
          placeholder='Select a plant...'
        />
        <Select
          id='unit-selector'
          value={this.state.selectedUnit}
          onChange={this.handleUnitChange}
          options={this.state.unitOpts}
          className='selector'
          placeholder='Select a unit...'
        />
        <button id="load-data-button" onClick={this.maybeLoadData}>Load data</button>
        <div id={SPINNER_DIV}></div>
      </div>
    );
  }
}

ReactDOM.render(
  <DashboardControl />, document.getElementById('dashboard-control'));
