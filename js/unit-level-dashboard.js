import { Spinner } from './spin.js';
import { PlantUnitInfo } from './plant-unit-info.js';
import { renderAllTimeSeries } from './all-time-series.js';
import { renderEmissionsIntensityVsCF } from './emis-intensity-vs-cf.js';
import {
  renderEfficiencyHistogram,
  renderCapacityFactorHistogram,
  renderEmissionsIntensityHistogram
} from './histograms.js';
import React from 'react';
import Select from 'react-select';
import ReactDOM from 'react-dom';
import PLANTS from './plants.json';
import { csv } from 'd3-fetch';
import { timeParse } from 'd3-time-format';

const GH_HOST = 'https://media.githubusercontent.com';
const EMIS_DATA_REPO =  `${GH_HOST}/media/widap/emissions-data/master/csv`;

const ALL_TIME_SERIES = 'all-time-series';
const EMISSIONS_INTENSITY_VS_CF = 'emissions-intensity-vs-cf';
const EFFICIENCY_HISTOGRAM = 'efficiency-histogram';
const CAPACITY_FACTOR_HISTOGRAM = 'capacity-factor-histogram';
const EMISSIONS_INTENSITY_HISTOGRAM = 'emissions-intensity-histogram';

const SPINNER_DIV = 'loading-spinner';
const SPINNER_OPTS = {lines: 9, length: 5, width: 3, radius: 5};

// TODO: Reformat CSV emissions data to have Unix timestamps instead.
const YMDH_PARSE = timeParse('%Y-%m-%d %H:00:00');

function loadPlants(rows) {
  var plants = {};
  rows.forEach(row => { plants[row.properties.orispl_code] = row.properties });
  return plants;
}

function parseTimeSeriesRow(row) {
  return {
    datetime: YMDH_PARSE(row.datetime),
    gen: +row.gen,
    co2_mass: +row.co2_mass,
    so2_mass: +row.so2_mass,
    nox_mass: +row.nox_mass,
    heat_input: +row.heat_input,
  }
}

function loadData(orisplCode, unitId) {
  const sanitizedUnitId = unitId.replace(/\*/g, '');
  const dataUri = `${EMIS_DATA_REPO}/${orisplCode}_${sanitizedUnitId}.csv`;
  return csv(dataUri, parseTimeSeriesRow);
}

class UnitLevelDashboard extends React.Component {
  state = {
    selectedPlant: null,
    unitOpts: [],
    selectedUnit: null,
    loadedPlant: null,
    loadedUnit: null,
  };
  spinner = new Spinner(SPINNER_OPTS);
  plantUnitMap = loadPlants(PLANTS);
  plantOptions = PLANTS.map(
    row => ({label: row.properties.name, value: row.properties.orispl_code}));

  clearPlots = () => {
    this.updatePlots([])
  }

  updatePlots = (data) => {
    renderAllTimeSeries(ALL_TIME_SERIES, data);
    renderEmissionsIntensityVsCF(EMISSIONS_INTENSITY_VS_CF, data);
    renderEfficiencyHistogram(EFFICIENCY_HISTOGRAM, data);
    renderCapacityFactorHistogram(CAPACITY_FACTOR_HISTOGRAM, data);
    renderEmissionsIntensityHistogram(EMISSIONS_INTENSITY_HISTOGRAM, data);
  }

  componentDidMount() {
    this.clearPlots();
  }

  handlePlantChange = (selected) => {
    if (selected !== this.state.selectedPlant) {
      this.setState({selectedPlant: selected, selectedUnit: null});
      if (selected != null && this.plantUnitMap[selected.value]) {
        const unitIds = this.plantUnitMap[selected.value].unit_ids;
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
        loadData(plant.value, unit.value)
            .then(data => this.updatePlots(data))
            .finally(() => this.spinner.stop());
      }
    }
  }

  getPlantInfo = (plant) => this.plantUnitMap[plant];

  render() {
    return (
      <div>
        <h1 className='page-title'>WIDAP Unit-Level Dashboard</h1>
        <div id='dashboard-control'>
          <Select
            id='plant-selector'
            value={this.state.selectedPlant}
            onChange={this.handlePlantChange}
            options={this.plantOptions}
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
          <button id="load-data-button" onClick={this.maybeLoadData}>Load</button>
          <div id={SPINNER_DIV}></div>
        </div>
        <PlantUnitInfo
          plant={this.state.loadedPlant}
          unit={this.state.loadedUnit}
          getInfo={this.getPlantInfo}
        />
        <div className='plot-container extra-tall' id={ALL_TIME_SERIES} />
        <div className='plot-container' id={EMISSIONS_INTENSITY_VS_CF} />
        <div className='plot-container' id={EFFICIENCY_HISTOGRAM} />
        <div className='plot-container' id={CAPACITY_FACTOR_HISTOGRAM} />
        <div className='plot-container' id={EMISSIONS_INTENSITY_HISTOGRAM} />
      </div>
    );
  }
}

ReactDOM.render(<UnitLevelDashboard />, document.getElementById('app-root'));
