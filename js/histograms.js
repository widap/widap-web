import { FONT, MARGIN, PLOT_CONFIG } from './defaults.js';

const KG_PER_LB = 0.45359237;
const KG_PER_TON = 2000 * KG_PER_LB;
const WH_PER_BTU = 0.29307107;
const DESIRED_NBINS = 250;
const CF_BINS = {start: 0.0, end: 1.0, size: 1 / DESIRED_NBINS};

function getMaxValue(arr) {
  return arr.length === 0 ? null : arr.reduce((a, b) => Math.max(a, b));
}

export function renderEfficiencyHistogram(divId, data) {
  const filtered = data.filter(d => d.heat_input > 0);
  const traces = [{
    x: filtered.map(d => d.gen / (d.heat_input * WH_PER_BTU)),
    type: 'histogram',
    xbins: CF_BINS,
    hoverlabel: {font: FONT},
  }];
  const layout = {
    autosize: true,
    title: {text: 'Histogram of observed efficiency values'},
    xaxis: {
      title: 'Efficiency (generation / heat input)',
      range: [0, 1],
    },
    yaxis: {
      title: 'Counts',
      'fixedrange': true,
    },
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, PLOT_CONFIG);
}

export function renderCapacityFactorHistogram(divId, data) {
  const maxHeat = getMaxValue(data.map(d => d.heat_input));
  const maxGen = getMaxValue(data.map(d => d.gen));
  const heat = data.map(d => d.heat_input / maxHeat).filter(d => d > 0.01);
  var pctOffNote = '';
  if (data.length > 0) {
    let pctOff = 100 - Math.round(100 * heat.length / data.length);
    pctOffNote = ` (ignoring ${pctOff}% of samples where unit was off)`;
  }
  const traces = [
    {
      x: heat,
      xbins: CF_BINS,
      type: 'histogram',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
    {
      x: data.map(d => d.gen / maxGen).filter(d => d > 0.01),
      xbins: CF_BINS,
      type: 'histogram',
      xaxis: 'x2',
      yaxis: 'y2',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
  ];
  const layout = {
    title: {text: 'Capacity factor histogram' + pctOffNote},
    showlegend: false,
    autosize: true,
    grid: {rows: 1, 'columns': 2, 'pattern': 'independent'},
    xaxis: {title: 'Capacity factor from heat input', range: [0, 1]},
    xaxis2: {title: 'Capacity factor from generation', range: [0, 1]},
    yaxis: {title: 'Counts', 'fixedrange': true},
    yaxis2: {title: 'Counts', 'fixedrange': true},
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, PLOT_CONFIG);
}

export function renderEmissionsIntensityHistogram(divId, data) {
  const co2FromHeat = data
    .filter(d => d.heat_input > 1.1)
    .map(d => KG_PER_TON * d.co2_mass / (d.heat_input * WH_PER_BTU));
  const co2FromGen = data
    .filter(d => d.gen > 1.1)
    .map(d => KG_PER_TON * d.co2_mass / d.gen);
  const maxCo2FromHeat = getMaxValue(co2FromHeat);
  const maxCo2FromGen = getMaxValue(co2FromGen);
  const traces = [
    {
      x: co2FromHeat,
      xbins: {size: maxCo2FromHeat / DESIRED_NBINS},
      type: 'histogram',
      hoverinfo: 'x+y+text',
      hoverlabel: {'font': FONT},
    },
    {
      x: co2FromGen,
      xbins: {size: maxCo2FromGen / DESIRED_NBINS},
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
  Plotly.react(divId, traces, layout, PLOT_CONFIG);
}
