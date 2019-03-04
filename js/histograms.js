import { FONT, MARGIN } from './defaults.js';

const KG_PER_LB = 0.45359237;
const KG_PER_TON = 2000 * KG_PER_LB;
const WH_PER_BTU = 0.29307107;

function getMaxValue(data, col) {
  if (data.length === 0) {
    return null;
  }
  return data.map(d => d[col]).reduce((a, b) => Math.max(a, b));
}

export function renderEfficiencyHistogram(divId, data) {
  const filtered = data.filter(d => d.heat_input > 0);
  const traces = [{
    x: filtered.map(d => d.gen / (d.heat_input * WH_PER_BTU)),
    type: 'histogram',
    xbins: {
      start: 0.0,
      end: 1.0,
    },
    hoverlabel: {font: FONT},
  }];
  const layout = {
    autosize: true,
    title: {text: 'Histogram of observed efficiency values'},
    xaxis: {title: 'Efficiency (generation / heat input)'},
    yaxis: {
      title: 'Counts',
      'fixedrange': true,
    },
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, {displaylogo: false});
}

export function renderCapacityFactorHistogram(divId, data) {
  const maxHeat = getMaxValue(data, 'heat_input');
  const maxGen = getMaxValue(data, 'gen');
  const traces = [
    {
      x: data.map(d => d.heat_input / maxHeat),
      type: 'histogram',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
    {
      x: data.map(d => d.gen / maxGen),
      type: 'histogram',
      xaxis: 'x2',
      yaxis: 'y2',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
  ];
  const layout = {
    title: {text: 'Capacity factor histogram'},
    showlegend: false,
    autosize: true,
    grid: {rows: 1, 'columns': 2, 'pattern': 'independent'},
    xaxis: {title: 'Capacity factor from heat input'},
    xaxis2: {title: 'Capacity factor from generation'},
    yaxis: {title: 'Counts', 'fixedrange': true},
    yaxis2: {title: 'Counts', 'fixedrange': true},
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, {displaylogo: false});
}

export function renderEmissionsIntensityHistogram(divId, data) {
  const co2FromHeat = data
    .filter(d => d.heat_input > 1.1)
    .map(d => KG_PER_TON * d.co2_mass / (d.heat_input * WH_PER_BTU));
  const co2FromGen = data
    .filter(d => d.gen > 1.1)
    .map(d => KG_PER_TON * d.co2_mass / d.gen);
  const traces = [
    {
      x: co2FromHeat,
      type: 'histogram',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
    {
      x: co2FromGen,
      type: 'histogram',
      xaxis: 'x2',
      yaxis: 'y2',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
  ];
  const layout = {
    title: {'text': 'Emissions intensity histogram'},
    showlegend: false,
    autosize: true,
    grid: {'rows': 1, 'columns': 2, 'pattern': 'independent'},
    xaxis: {'title': 'CO<sub>2</sub> intensity from heat input (kg/MWh)'},
    xaxis2: {'title': 'CO<sub>2</sub> intensity from generation (kg/MWh)'},
    yaxis: {'title': 'Counts', 'fixedrange': true},
    yaxis2: {'title': 'Counts', 'fixedrange': true},
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, {displaylogo: false});
}
