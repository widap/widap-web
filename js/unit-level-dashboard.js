const spin = require('./spin.js');
const renderGenerationTimeSeries = require('./generation-time-series.js');
const renderEmissionsTimeSeries = require('./emissions-time-series.js');
const React = require('react');
const Select = require('react-select').default;
const ReactDOM = require('react-dom');
const PLANTS_UNITS = require('./plants-units.js');
const d3 = require('d3');

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

class DashboardControl extends React.Component {
  state = {
    selectedPlant: null,
    unitOpts: [],
    selectedUnit: null,
  };

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

  loadData = (e) => {
    const plant = this.state.selectedPlant, unit = this.state.selectedUnit;
    if (plant != null && unit != null) {
      // TODO: Don't actually reload unless the plant/unit have changed.
      // TODO: Use a React spinner.
      var spinner = new spin.Spinner(SPINNER_OPTS);
      spinner.spin(document.getElementById(SPINNER_DIV));
      this.clearPlots();
      const sanitizedUnitId = unit.value.replace('*', '')
      const dataUri = `${EMIS_DATA_REPO}/${plant.value}_${sanitizedUnitId}.csv`
      d3.csv(dataUri, parseTimeSeriesRow).then(data => {
        this.updatePlots(data);
        spinner.stop();
      });
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
        <button id="load-data-button" onClick={this.loadData}>Load data</button>
        <div id={SPINNER_DIV}></div>
      </div>
    );
  }
}

ReactDOM.render(
  <DashboardControl />, document.getElementById('dashboard-control'));
