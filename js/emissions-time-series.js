import { FONT } from './defaults.js';
import { getQuantiles, rezoom } from './timeseries.js';

const GAS_OPTIONS = {
  'so2_mass': {name: 'SO2 (lbs/hr)', color: 'green', yaxis: 'y'},
  'nox_mass': {name: 'NOx (lbs/hr)', color: 'orange', yaxis: 'y2'},
  'co2_mass': {name: 'CO2 (tons/hr)', color: 'steelblue', yaxis: 'y3'}
}

const LAYOUT = {
  showlegend: false,
  autosize: true,
  title: {text: 'Emissions time series'},
  font: FONT,
  grid: {yaxes: ['y', 'y2', 'y3'], rows: 3, columns: 1},
  xaxis: {type: 'date'},
  yaxis: {fixedrange: true, title: {text: 'SO<sub>2</sub> (lbs/hr)'}},
  yaxis2: {fixedrange: true, title: {text: 'NO<sub>x</sub> (lbs/hr)'}},
  yaxis3: {fixedrange: true, title: {text: 'CO<sub>2</sub> (tons/hr)'}},
}

function trendTraceGen(bins, gas) {
  const dt = bins[gas].map(bin => bin.t)
  return (name, accessor, opts) => {
    const trace = {
      type: 'scatter',
      name: `${name} ${GAS_OPTIONS[gas].name}`,
      x: dt,
      y: bins[gas].map(accessor),
      yaxis: GAS_OPTIONS[gas].yaxis,
      hoverlabel: {font: FONT},
    }
    return Object.assign(trace, opts)
  }
}

function trendTraces(bins) {
  return Object.keys(GAS_OPTIONS).flatMap(gas => {
    const traceGen = trendTraceGen(bins, gas)
    return [
      traceGen('min', d => d.min, {line: {color: '#CCC', width: 0.5}}),
      traceGen('max', d => d.max, {line: {color: '#CCC', width: 0.5}, fill: 'tonexty'}),
      traceGen('25%', d => d.q1, {line: {color: '#999', width: 0.5}}),
      traceGen('75%', d => d.q3, {line: {color: '#999', width: 0.5}, fill: 'tonexty'}),
      traceGen('median', d => d.q2, {line: {color: GAS_OPTIONS[gas].color, width: 1.8}}),
    ]})
}

function hourlyTraces(data) {
  return Object.keys(GAS_OPTIONS).map(gas => ({
    type: 'scatter',
    name: GAS_OPTIONS[gas].name,
    x: data.map(d => d.datetime),
    y: data.map(d => d[gas]),
    yaxis: GAS_OPTIONS[gas].yaxis,
    hoverlabel: {font: FONT},
    line: {color: GAS_OPTIONS[gas].color, width: 1.5},
  }))
}

export function renderEmissionsTimeSeries(divId, data) {
  $(`#${divId}`).off('plotly_relayout')
  var traces = hourlyTraces(data)
  var quartiles = {monthly: {}, weekly: {}, daily: {}}
  if (data.length > 0) {
    Object.keys(GAS_OPTIONS).forEach(gas => {
      let gasQuantiles = getQuantiles(data, gas);
      quartiles.monthly[gas] = gasQuantiles.monthly;
      quartiles.weekly[gas] = gasQuantiles.weekly;
      quartiles.daily[gas] = gasQuantiles.daily;
    });
    const allTraces = {
      monthly: trendTraces(quartiles.monthly),
      weekly: trendTraces(quartiles.weekly),
      daily: trendTraces(quartiles.daily),
      hourly: traces,
    };
    $(`#${divId}`).on('plotly_relayout', rezoom(divId, allTraces));
    Plotly.react(divId, allTraces.monthly, LAYOUT, {displaylogo: false});
    Plotly.relayout(divId, {});
  } else {
    Plotly.react(divId, traces, LAYOUT, {displaylogo: false});
  }
}
