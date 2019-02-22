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

function quantilesFromBins(bins) {
  return Object.keys(bins).map(
    idx => {
      const vals = bins[idx];
      return {
        t: +idx,
        min: vals[0],
        q1: quantile(vals, 0.25),
        q2: quantile(vals, 0.5),
        q3: quantile(vals, 0.75),
        max: vals[vals.length - 1],
      };
    });
}

function sortBinVals(bins) {
  Object.keys(bins).forEach(idx => bins[idx].sort((a, b) => a - b));
}

export function getQuantiles(data, col) {
  if (data.length == 0) {
    return {daily: [], weekly: [], monthly: []};
  }
  var dailyBins = {};
  data.forEach(d => {
    const day = timeDay.floor(d.datetime).getTime();
    dailyBins[day] = dailyBins[day] || [];
    dailyBins[day].push(d[col]);
  });
  // Sorting daily bins prior to constructing weekly and monthly bins enables us
  // to speed up sorting on those two because they will already be semi-sorted.
  sortBinVals(dailyBins);
  var weeklyBins = [], monthlyBins = [];
  Object.keys(dailyBins).forEach(day => {
    const week = timeWeek.floor(day).getTime();
    const month = timeMonth.floor(day).getTime();
    weeklyBins[week] = weeklyBins[week] || [];
    monthlyBins[month] = monthlyBins[month] || [];
    dailyBins[day].forEach(v => {
      weeklyBins[week].push(v);
      monthlyBins[month].push(v);
    });
  });
  sortBinVals(weeklyBins);
  sortBinVals(monthlyBins);
  return {
    daily: quantilesFromBins(dailyBins),
    weekly: quantilesFromBins(weeklyBins),
    monthly: quantilesFromBins(monthlyBins),
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
