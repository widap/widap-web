import { timeFormat } from 'd3-time-format';
import { FONT, MARGIN } from './defaults.js';

const KG_PER_LB = 0.45359237;
const KG_PER_TON = 2000 * KG_PER_LB;
const DATE_HOUR_FMT = timeFormat('%Y-%m-%d %H:%M');

// Durstenfeld shuffle. Modifies array in-place.
function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

function jitter(array, maxJitter) {
  return array.map(x => x + maxJitter * (Math.random() - 0.5));
}

// TODO: Probably only render a single gas at a time. It's quite costly to do a
// ScatterGL plot with 150k points, and it's a lot of information for a user to
// ingest anyways. Removing one of the two would save ~1.75s in load time.
export function renderEmissionsIntensityVsCF(divId, data) {
  var traces = [];
  if (data.length > 0) {
    var dataCopy = data.slice();
    shuffle(dataCopy);
    const maxGen = dataCopy.map(d => d.gen).reduce((a, b) => Math.max(a, b));
    dataCopy.forEach(d => d.cf = d.gen / maxGen);
    const filtered = dataCopy.filter(d => d.cf > 0.02);
    const contourTraceDefs = [
      {y: filtered.map(d => KG_PER_TON * d.co2_mass / d.gen), xaxis: 'x', yaxis: 'y'},
      {y: filtered.map(d => KG_PER_LB * d.so2_mass / d.gen), xaxis: 'x2', yaxis: 'y2'},
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
    const sample = filtered.slice(0, 1000);
    const scatterTraceDefs = [
      {y: sample.map(d => KG_PER_TON * d.co2_mass / d.gen), xaxis: 'x', yaxis: 'y'},
      {y: sample.map(d => KG_PER_LB * d.so2_mass / d.gen), xaxis: 'x2', yaxis: 'y2'},
    ];
    const scatters = scatterTraceDefs.map(
      traceDef => ({
        x: jitter(sample.map(d => d.cf), 0.005),
        y: traceDef.y,
        type: 'scatter',
        text: sample.map(d => DATE_HOUR_FMT(d.datetime)),
        xaxis: traceDef.xaxis,
        yaxis: traceDef.yaxis,
        mode: 'markers',
        hoverinfo: 'x+y+text',
        hoverlabel: {font: FONT},
        marker: {
          'size': 3.5,
          'color': sample.map(d => d.datetime.getFullYear()),
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
    xaxis: {title: 'Capacity Factor'},
    xaxis2: {title: 'Capacity Factor'},
    yaxis: {title: 'CO<sub>2</sub> Intensity (kg/MWh)'},
    yaxis2: {title: 'SO<sub>2</sub> Intensity (lbs/MWh)'},
    font: FONT,
    margin: MARGIN,
  };
  Plotly.react(divId, traces, layout, {displaylogo: false});
}
