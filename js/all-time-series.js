import { FONT } from './defaults.js';
import { quantile } from 'd3-array';
import { timeDay, timeWeek, timeMonth } from 'd3-time';
import { timeParse } from 'd3-time-format';

const ZOOM_THRESHOLD_DAY_MS = 1.4e10
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const ZOOM_THRESHOLD_MONTH_MS = 30 * ZOOM_THRESHOLD_DAY_MS

const YMD_PARSER = timeParse('%Y-%m-%d');
const HM_PARSER = timeParse('%H:%M');
const HMS_PARSER = timeParse('%H:%M:%S');

const SERIES_OPTIONS = {
  'gen': {name: 'gen (MWh/hr)', color: '#8c1515', yaxis: 'y'},
  'so2_mass': {name: 'SO2 (lbs/hr)', color: 'green', yaxis: 'y2'},
  'nox_mass': {name: 'NOx (lbs/hr)', color: 'orange', yaxis: 'y3'},
  'co2_mass': {name: 'CO2 (tons/hr)', color: 'steelblue', yaxis: 'y4'},
}

const LAYOUT = {
  showlegend: false,
  autosize: true,
  title: {
    text: 'Time series (Generation, SO<sub>2</sub>, NO<sub>x</sub>, CO<sub>2</sub>)',
  },
  font: FONT,
  grid: {yaxes: ['y', 'y2', 'y3', 'y4'], rows: 4, columns: 1},
  xaxis: {type: 'date', title: 'Date'},
  yaxis: {fixedrange: true, title: {text: 'Generation (MWh/hr)'}},
  yaxis2: {fixedrange: true, title: {text: 'SO<sub>2</sub> (lbs/hr)'}},
  yaxis3: {fixedrange: true, title: {text: 'NO<sub>x</sub> (lbs/hr)'}},
  yaxis4: {fixedrange: true, title: {text: 'CO<sub>2</sub> (tons/hr)'}},
}

// Plotly emits time range data in very inconsistent formats. Here are 4 strings
// we might have to interpret:
// - "2000-12-01"
// - "2010-03-18 18:00"
// - "2009-04-09 01:52:30"
// - "2008-05-14 13:51:28.6957"
// This method ignores fractional seconds but otherwise tries to return the most
// granular Date object for the given string.
function parseDate(spec) {
  let parts = spec.split(' '), date = YMD_PARSER(parts[0]);
  if (parts.size > 1) {
    let hmsSpec = parts[1].split('.')[0]; // ignore fractional seconds
    let hms = HMS_PARSER(hmsSpec) || HM_PARSER(hmsSpec);
    return new Date(date + hms);
  }
  return date;
}

function addDays(days) {
  return (date) => date.setDate(date.getDate() + days);
}

function addMonths(months) {
  return (date) => date.setMonth(date.getMonth() + months);
}

function quartilesFromBins(bins) {
  return bins.map(bin => ({
    t: bin.t,
    min: bin.values[0],
    q1: quantile(bin.values, 0.25),
    q2: quantile(bin.values, 0.5),
    q3: quantile(bin.values, 0.75),
    max: bin.values[bin.values.length - 1],
  }));
}

function sortBinVals(bins) {
  bins.forEach(bin => bin.values.sort((a, b) => a - b));
}

function quartilesFromDailyBins(dailyBins, d3Interval, increment) {
  var dateBoundary = d3Interval.floor(dailyBins[0].t);
  var bins = [{t: new Date(dateBoundary.valueOf()), values: []}];
  increment(dateBoundary);
  var i = 0;
  while (i < dailyBins.length) {
    if (dailyBins[i].t < dateBoundary) {
      dailyBins[i].values.forEach(v => bins[bins.length-1].values.push(v));
      i++;
    } else {
      bins.push({t: new Date(dateBoundary.valueOf()), values: []});
      increment(dateBoundary);
    }
  }
  sortBinVals(bins);
  return quartilesFromBins(bins);
}

function getQuartiles(data, col) {
  if (data.length == 0) {
    return {daily: [], weekly: [], monthly: []};
  }
  var nextDay = timeDay.floor(data[0].datetime);
  var dailyBins = [{t: new Date(nextDay.valueOf()), values: []}];
  addDays(1)(nextDay);
  var i = 0;
  while (i < data.length) {
    if (data[i].datetime < nextDay) {
      dailyBins[dailyBins.length-1].values.push(data[i][col]);
      i++;
    } else {
      dailyBins.push({t: new Date(nextDay.valueOf()), values: []});
      addDays(1)(nextDay);
    }
  }
  // Sorting daily bins prior to constructing weekly and monthly bins enables us
  // to speed up sorting on those two because they will already be semi-sorted.
  sortBinVals(dailyBins);
  return {
    daily: quartilesFromBins(dailyBins),
    weekly: quartilesFromDailyBins(dailyBins, timeWeek, addDays(7)),
    monthly: quartilesFromDailyBins(dailyBins, timeMonth, addMonths(1)),
  };
}

function filterTrace(trace, left, right) {
  // Plotly has a d3-based filter transform for this; however, i tried it out
  // and it was very slow (https://plot.ly/javascript/filter/).
  if (trace.x.length == 0) {
    return trace
  }
  var filtered = {}
  Object.keys(trace).forEach(k => filtered[k] = trace[k])
  filtered.x = [trace.x[0]], filtered.y = [trace.y[0]]
  for (var i = 1; i < trace.x.length - 1; i++) {
    if (left < trace.x[i] && trace.x[i] < right) {
      filtered.x.push(trace.x[i])
      filtered.y.push(trace.y[i])
    }
  }
  filtered.x.push(trace.x[trace.x.length - 1])
  filtered.y.push(trace.y[trace.y.length - 1])
  return filtered
}

function selectTraces(allTraces, timeDelta) {
  if (timeDelta > ZOOM_THRESHOLD_MONTH_MS)
    return allTraces.monthly
  if (timeDelta > ZOOM_THRESHOLD_WEEK_MS)
    return allTraces.weekly
  if (timeDelta > ZOOM_THRESHOLD_DAY_MS)
    return allTraces.daily
  return allTraces.hourly
}

function rezoom(divId, allTraces) {
  return (update) => {
    const layout = update.currentTarget.layout, xRange = layout.xaxis.range;
    var traces;
    if (layout.xaxis.autorange) {
      let timeStart = parseDate(xRange[0]);
      let timeEnd = parseDate(xRange[1]);
      traces = selectTraces(allTraces, timeEnd - timeStart);
    } else {
      let timeStart = parseDate(xRange[0]),
          timeEnd = parseDate(xRange[1]),
          timeDelta = timeEnd - timeStart;
      let left = new Date(timeStart.getTime() - timeDelta);
      let right = new Date(timeEnd.getTime() + timeDelta);
      let selected = selectTraces(allTraces, timeDelta);
      traces = selected.map(trace => filterTrace(trace, left, right));
    }
    Plotly.react(divId, traces, layout)
  };
}


function trendSeriesGenerator(bins, col) {
  const dt = bins[col].map(bin => bin.t);
  return (name, accessor, opts) => {
    const trace = {
      type: 'scatter',
      name: `${name} ${SERIES_OPTIONS[col].name}`,
      x: dt,
      y: bins[col].map(accessor),
      yaxis: SERIES_OPTIONS[col].yaxis,
      hoverlabel: {font: FONT},
    }
    return Object.assign(trace, opts);
  };
}

function trendSeries(bins) {
  return Object.keys(SERIES_OPTIONS).flatMap(col => {
    const traceGen = trendSeriesGenerator(bins, col);
    return [
      traceGen('min', d => d.min, {line: {color: '#CCC', width: 0.5}}),
      traceGen('max', d => d.max, {line: {color: '#CCC', width: 0.5}, fill: 'tonexty'}),
      traceGen('25%', d => d.q1, {line: {color: '#999', width: 0.5}}),
      traceGen('75%', d => d.q3, {line: {color: '#999', width: 0.5}, fill: 'tonexty'}),
      traceGen('median', d => d.q2, {line: {color: SERIES_OPTIONS[col].color, width: 1.8}}),
    ]});
}

function hourlyTraces(data) {
  return Object.keys(SERIES_OPTIONS).map(col => ({
    type: 'scatter',
    name: SERIES_OPTIONS[col].name,
    x: data.map(d => d.datetime),
    y: data.map(d => d[col]),
    yaxis: SERIES_OPTIONS[col].yaxis,
    hoverlabel: {font: FONT},
    line: {color: SERIES_OPTIONS[col].color, width: 1.5},
  }));
}

export function renderAllTimeSeries(divId, data) {
  $(`#${divId}`).off('plotly_relayout');
  var traces = hourlyTraces(data);
  var quartiles = {monthly: {}, weekly: {}, daily: {}};
  if (data.length > 0) {
    Object.keys(SERIES_OPTIONS).forEach(col => {
      let seriesQuartiles = getQuartiles(data, col);
      quartiles.monthly[col] = seriesQuartiles.monthly;
      quartiles.weekly[col] = seriesQuartiles.weekly;
      quartiles.daily[col] = seriesQuartiles.daily;
    });
    const allTraces = {
      monthly: trendSeries(quartiles.monthly),
      weekly: trendSeries(quartiles.weekly),
      daily: trendSeries(quartiles.daily),
      hourly: traces,
    };
    $(`#${divId}`).on('plotly_relayout', rezoom(divId, allTraces));
    Plotly.react(divId, allTraces.monthly, LAYOUT, {displaylogo: false});
    Plotly.relayout(divId, {});
  } else {
    Plotly.react(divId, traces, LAYOUT, {displaylogo: false});
  }
}
