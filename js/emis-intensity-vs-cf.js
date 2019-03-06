import { timeFormat } from 'd3-time-format';
import {
  FONT,
  MARGIN,
  PLOT_CONFIG,
  MAX_CO2I_FROM_GEN,
  MAX_SO2I_FROM_GEN
} from './defaults.js';

const KG_PER_LB = 0.45359237;
const KG_PER_TON = 2000 * KG_PER_LB;
const DATE_HOUR_FMT = timeFormat('%Y-%m-%d %H:%M');
const NUM_SCATTER_POINTS = 1500;

// Samples using Durstenfeld (Fisher-Yates) shuffle.
function sample(array, sampleSize) {
  const n = Math.min(sampleSize, array.length);
  var sampled = [];
  var arrayCopy = array.slice();
  var i = arrayCopy.length - 1;
  while (sampled.length < n) {
    var j = Math.floor(Math.random() * (i + 1));
    sampled.push(arrayCopy[j]);
    arrayCopy[j] = arrayCopy[i];
    arrayCopy[i] = sampled[sampled.length-1];
    i--;
  }
  return sampled;
}

function jitter(array, maxJitter) {
  return array.map(x => x + maxJitter * (Math.random() - 0.5));
}

export function renderEmissionsIntensityVsCF(divId, data) {
  var traces = [];
  if (data.length > 0) {
    const maxGen = data.map(d => d.gen).reduce((a, b) => Math.max(a, b));
    data.forEach(d => {
      d.cf = d.gen / maxGen;
      d.co2_ei = KG_PER_TON * d.co2_mass / d.gen;
      d.so2_ei = KG_PER_LB * d.so2_mass / d.gen;
    });
    const filtered = data.filter(d => {
      return d.cf > 0.02 && d.co2_ei < MAX_CO2I_FROM_GEN && d.so2_ei < MAX_SO2I_FROM_GEN;
    });
    const contourTraceDefs = [
      {y: filtered.map(d => d.co2_ei), xaxis: 'x', yaxis: 'y'},
      {y: filtered.map(d => d.so2_ei), xaxis: 'x2', yaxis: 'y2'},
    ];
    const contours = contourTraceDefs.map(
      traceDef => ({
        x: filtered.map(d => d.cf),
        y: traceDef.y,
        xaxis: traceDef.xaxis,
        yaxis: traceDef.yaxis,
        colorscale: 'Hot',
        reversescale: true,
        type: 'histogram2dcontour',
        hoverinfo: 'none',
        showlegend: false,
        showscale: false,
      }));
    const sampled = sample(filtered, NUM_SCATTER_POINTS);
    const scatterTraceDefs = [
      {y: sampled.map(d => d.co2_ei), xaxis: 'x', yaxis: 'y'},
      {y: sampled.map(d => d.so2_ei), xaxis: 'x2', yaxis: 'y2'},
    ];
    const scatters = scatterTraceDefs.map(
      traceDef => ({
        x: jitter(sampled.map(d => d.cf), 0.005),
        y: traceDef.y,
        type: 'scatter',
        text: sampled.map(d => DATE_HOUR_FMT(d.datetime)),
        xaxis: traceDef.xaxis,
        yaxis: traceDef.yaxis,
        mode: 'markers',
        hoverinfo: 'x+y+text',
        hoverlabel: {font: FONT},
        marker: {
          'size': 3.5,
          'color': sampled.map(d => d.datetime.getFullYear()),
          'colorscale': 'Viridis',
          'showscale': true,
        },
      }));
    traces = scatters.concat(contours);
  }
  const layout = {
    title: {
      text: 'Emissions intensity vs capacity factor (CO<sub>2</sub> and SO<sub>2</sub>)'
    },
    autosize: true,
    showlegend: false,
    grid: {
      rows: 1,
      columns: 2,
      pattern: 'independent',
    },
    xaxis: {title: 'Capacity Factor', range: [0, 1]},
    xaxis2: {title: 'Capacity Factor', range: [0, 1]},
    yaxis: {title: 'CO<sub>2</sub> Intensity (kg/MWh)'},
    yaxis2: {title: 'SO<sub>2</sub> Intensity (lbs/MWh)'},
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, PLOT_CONFIG);
}
