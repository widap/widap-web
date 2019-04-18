import { FONT, PLOT_CONFIG, MARGIN } from './defaults.js';
import { interpolateViridis } from 'd3-scale-chromatic';

function newHourlyTotals() {
  var coll = [];
  for (var i = 0; i < 24; i++) {
    coll.push({total: 0, count: 0});
  }
  return coll;
}

function computeHourOfDayAverages(data) {
  var avgs = {};
  if (data.length > 0) {
    var currentYear = data[0].datetime.getFullYear();
    var hourlyTotals = newHourlyTotals();
    for (var i = 0; i < data.length; i++) {
      var year = data[i].datetime.getFullYear();
      if (year > currentYear) {
        avgs[currentYear] = hourlyTotals.map(x => x.total / x.count);
        currentYear = year;
        hourlyTotals = newHourlyTotals();
      }
      let hour = data[i].datetime.getHours();
      hourlyTotals[hour].count += 1;
      hourlyTotals[hour].total += data[i].gen;
    }
    // Need to add the last year of data, unless it's 2018, in which case
    // we have inconsistent data, only every two hours instead of every 1.
    if (currentYear < 2018) {
      avgs[currentYear] = hourlyTotals.map(x => x.total / x.count);
    }
  }
  return avgs;
}

function viridisColorFn(yearStrings) {
  const years = yearStrings.map(x => parseInt(x));
  const a = years[0], b = years[years.length - 1];
  return z => interpolateViridis((parseInt(z) - a) / (b - a));
}

export function renderHourOfDayAvg(divId, data) {
  var hourOfDayAvgs = computeHourOfDayAverages(data);
  var traces = [];
  const colorFn = viridisColorFn(Object.keys(hourOfDayAvgs));
  for (var entry of Object.entries(hourOfDayAvgs)) {
    let trace = {
      type: 'scatter',
      name: entry[0],
      x: entry[1].keys(),
      y: entry[1],
      hoverinfo: 'none',
      line: {
        color: colorFn(entry[0]),
      },
    };
    traces.push(trace);
  }
  const layout = {
    autosize: true,
    font: FONT,
    margin: MARGIN,
    xaxis: {title: {text: 'Hour of day (0-23)'}},
    yaxis: {title: {text: 'Avg generation (MW)'}},
  };
  Plotly.react(divId, traces, layout, PLOT_CONFIG);
}
