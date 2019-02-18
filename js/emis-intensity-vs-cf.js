const DEFAULTS = require('./defaults.js')

const KG_PER_LB = 0.45359237
const KG_PER_TON = 2000 * KG_PER_LB
const DATE_HOUR_FMT = d3.timeFormat('%Y-%m-%d %H:%M')

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
  return array.map(x => x + (maxJitter * (Math.random() - 0.5)))
}

function renderEmissionsIntensityVsCapFactor(divId, data) {
  var traces = []
  if (data.length > 0) {
    var dataCopy = data.slice()
    shuffle(dataCopy)
    const maxGen = dataCopy.map(d => d.gen).reduce((a, b) => Math.max(a, b))
    dataCopy.forEach(d => d.cf = d.gen / maxGen)
    const filtered = dataCopy.filter(d => d.cf > 0.02)
    const traceDefs = [
      {y: filtered.map(d => KG_PER_TON * d.co2_mass / d.gen), xaxis: 'x', yaxis: 'y'},
      {y: filtered.map(d => KG_PER_LB * d.so2_mass / d.gen), xaxis: 'x2', yaxis: 'y2'},
    ]
    traces = traceDefs.map(
      traceDef => ({
        x: jitter(filtered.map(d => d.cf), 0.005),
        y: traceDef.y,
        xaxis: traceDef.xaxis,
        yaxis: traceDef.yaxis,
        type: 'scattergl',
        text: filtered.map(d => DATE_HOUR_FMT(d.datetime)),
        mode: 'markers',
        hoverinfo: 'x+y+text',
        hoverlabel: {font: DEFAULTS.FONT},
        marker: {
          'size': 3.5,
          'color': filtered.map(d => d.datetime.getFullYear()),
          'colorscale': 'Viridis',
          'showscale': true,
        }
      }))
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
    font: DEFAULTS.FONT,
    margin: DEFAULTS.MARGIN,
  }
  Plotly.react(divId, traces, layout, {displaylogo: false})
}
