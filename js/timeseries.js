import Plotly from 'plotly.js-basic-dist';
import { quantile } from 'd3-array';
import { timeDay, timeWeek, timeMonth } from 'd3-time';
import { timeParse } from 'd3-time-format';

const ZOOM_THRESHOLD_DAY_MS = 1.4e10
const ZOOM_THRESHOLD_WEEK_MS = 7 * ZOOM_THRESHOLD_DAY_MS
const ZOOM_THRESHOLD_MONTH_MS = 30 * ZOOM_THRESHOLD_DAY_MS

const YMD_PARSER = timeParse('%Y-%m-%d');
const YMD_HMS_PARSER = timeParse('%Y-%m-%d %H:%M:%S');

// Parses a time such as "2007-09-08" or "2007-09-08 08:10:26.087", returning
// the same for both values.
function parseDateWithDayResolution(spec) {
  return YMD_PARSER(spec.split(' ')[0]);
}

// Parses a time such as "2007-09-08 08:10:26.087", ignoring fractional seconds
function parseDateWithSecondResolution(spec) {
  return YMD_HMS_PARSER(spec.split('.')[0]);
}

function addDays(days) {
  return (date) => date.setDate(date.getDate() + days);
}

function addMonths(months) {
  return (date) => date.setMonth(date.getMonth() + months);
}

function quantilesFromBins(bins) {
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

function quantilesFromDailyBins(dailyBins, d3Interval, increment) {
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
  return quantilesFromBins(bins);
}

export function getQuantiles(data, col) {
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
    daily: quantilesFromBins(dailyBins),
    weekly: quantilesFromDailyBins(dailyBins, timeWeek, addDays(7)),
    monthly: quantilesFromDailyBins(dailyBins, timeMonth, addMonths(1)),
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

export function rezoom(divId, allTraces) {
  return (update) => {
    const layout = update.currentTarget.layout, xRange = layout.xaxis.range;
    var traces;
    if (layout.xaxis.autorange) {
      let timeStart = parseDateWithDayResolution(xRange[0]);
      let timeEnd = parseDateWithDayResolution(xRange[1]);
      traces = selectTraces(allTraces, timeEnd - timeStart);
    } else {
      let timeStart = parseDateWithSecondResolution(xRange[0]),
          timeEnd = parseDateWithSecondResolution(xRange[1]),
          timeDelta = timeEnd - timeStart;
      let left = new Date(timeStart.getTime() - timeDelta);
      let right = new Date(timeEnd.getTime() + timeDelta);
      let selected = selectTraces(allTraces, timeDelta);
      traces = selected.map(trace => filterTrace(trace, left, right));
    }
    Plotly.react(divId, traces, layout)
  };
}
