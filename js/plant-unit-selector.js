const React = require('react');
const Select = require('react-select').default;
const PLANTS_UNITS = require('./plants-units.js');

const PLANT_UNIT_MAP = loadPlantsUnits(PLANTS_UNITS);
const PLANT_OPTIONS = PLANTS_UNITS.map(
  row => ({label: row.name, value: row.orispl_code}));

function loadPlantsUnits(rows) {
  var plantsUnits = {};
  rows.forEach(row => plantsUnits[row.orispl_code] = {
    name: row.name,
    unitIds: row.unit_ids,
  });
  return plantsUnits;
}

class PlantUnitSelector extends React.Component {
  state = {
    selectedPlant: null,
    unitOpts: [],
    selectedUnit: null,
  };

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
      this.props.loadData(plant.value, unit.value);
    }
  }

  render() {
    return (
      <div>
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
        noOptionsMessage={() => 'Select a plant first'}
      />
      <button type="button" onClick={this.loadData}>Load data</button>
      </div>
    );
  }
}

module.exports = PlantUnitSelector;
