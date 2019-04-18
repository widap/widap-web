import { Spinner } from './spin.js';
import { PlantUnitInfo } from './plant-unit-info.js';
import { renderAllTimeSeries } from './all-time-series.js';
import { renderEmissionsIntensityVsCF } from './emis-intensity-vs-cf.js';
import { renderHourOfDayAvg } from './hour-of-day-avg.js';
import {
  renderEfficiencyHistogram,
  renderCapacityFactorHistogram,
  renderEmissionsIntensityHistogram
} from './histograms.js';
import React from 'react';
import Select from 'react-select';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import PLANTS from './plants.json';
import { csv } from 'd3-fetch';
import { timeParse } from 'd3-time-format';

const GH_HOST = 'https://media.githubusercontent.com';
const EMIS_DATA_REPO =  `${GH_HOST}/media/widap/emissions-data/master/csv`;

const ALL_TIME_SERIES = 'all-time-series';
const EMISSIONS_INTENSITY_VS_CF = 'emissions-intensity-vs-cf';
const HOUR_OF_DAY_AVG = 'hour-of-day-avg';
const EFFICIENCY_HISTOGRAM = 'efficiency-histogram';
const CAPACITY_FACTOR_HISTOGRAM = 'capacity-factor-histogram';
const EMISSIONS_INTENSITY_HISTOGRAM = 'emissions-intensity-histogram';

const TIME_SERIES_MD = `
## Visualization 1: Time series with quartile aggregation

The first visualization displays time series data of generation and emissions
over the period of data collection. When zoomed out, the plot displays quartiles
at an appropriate aggregation level (daily, weekly, or monthly); when zoomed in
sufficiently, the plot displays the actual hourly data.
`;

const EI_MD = `
## Visualization 2: Emissions Intensity vs Capacity Factor

The second visualization displays a mixed contour plot and scatter plot of hourly
emissions intensity of CO2 and SO2 versus capacity factor. The contours show
what regime the unit spends most of its operation in, with more intense colors
indicating a higher proportion of observations. The scatter points are a small
random sample of the entire dataset, and their color indicates what year they
were drawn from, suggesting how the operation pattern has shifted over time.
`;

const HOUR_OF_DAY_AVG_MD = `
## Visualization 3: Hour-of-day averages

This plot illustrates how a unit's daily dispatch pattern has shifted over the
years. Each line represents a given year's average generation at each hour of
the day.
`;

const HISTOGRAM_MD = `
## Visualization 4: Histograms

The remaining plots are a series of histograms of various plant metrics, showing
the counts of observations of these metrics. Efficiency is calculated as
generation divided by heat input, where both values were converted to the same
units, so that the output is unitless. The other plots are calculated with both
heat input and generation data. It is worth noting when these are similar or
different. The corresponding efficiency plot may help to explain discrepancies.
`;

const SPINNER_DIV = 'loading-spinner';
const SPINNER_OPTS = {lines: 9, length: 5, width: 3, radius: 5};

// TODO: Reformat CSV emissions data to have Unix timestamps instead.
const YMDH_PARSE = timeParse('%Y-%m-%d %H:00:00');

function loadPlants(rows) {
  var plants = {};
  rows.forEach(row => { plants[row.properties.orispl_code] = row.properties });
  return plants;
}

function makeSelectOption(props) {
  return {label: props.name, value: props.orispl_code};
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
  plantOptions = PLANTS.map(row => makeSelectOption(row.properties));

  clearPlots = () => {
    this.updatePlots([])
  }

  updatePlots = (data) => {
    renderAllTimeSeries(ALL_TIME_SERIES, data);
    renderEmissionsIntensityVsCF(EMISSIONS_INTENSITY_VS_CF, data);
    renderHourOfDayAvg(HOUR_OF_DAY_AVG, data);
    renderEfficiencyHistogram(EFFICIENCY_HISTOGRAM, data);
    renderCapacityFactorHistogram(CAPACITY_FACTOR_HISTOGRAM, data);
    renderEmissionsIntensityHistogram(EMISSIONS_INTENSITY_HISTOGRAM, data);
  }

  componentDidMount() {
    this.clearPlots();
    // If the user passed in an initial ORISPL code, prefill the dropdown
    // appropriately.
    const urlParams = new URLSearchParams(window.location.search);
    const initialOrisplCode = urlParams.get("orispl_code");
    if (initialOrisplCode !== null) {
      if (this.plantUnitMap.hasOwnProperty(initialOrisplCode)) {
        const plantOption = makeSelectOption(this.plantUnitMap[initialOrisplCode]);
        this.handlePlantChange(plantOption);
      }
    }
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
        <div class='text-container'><ReactMarkdown source={TIME_SERIES_MD} /></div>
        <div className='plot-container extra-tall' id={ALL_TIME_SERIES} />
        <div class='text-container'><ReactMarkdown source={EI_MD} /></div>
        <div className='plot-container' id={EMISSIONS_INTENSITY_VS_CF} />
        <div class='text-container'><ReactMarkdown source={HOUR_OF_DAY_AVG_MD} /></div>
        <div className='plot-container' id={HOUR_OF_DAY_AVG} />
        <div class='text-container'><ReactMarkdown source={HISTOGRAM_MD} /></div>
        <div className='plot-container' id={EFFICIENCY_HISTOGRAM} />
        <div className='plot-container' id={CAPACITY_FACTOR_HISTOGRAM} />
        <div className='plot-container' id={EMISSIONS_INTENSITY_HISTOGRAM} />
      </div>
    );
  }
}

ReactDOM.render(<UnitLevelDashboard />, document.getElementById('app-root'));
