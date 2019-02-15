const DEFAULTS = require('./defaults.js')

const KG_PER_LB = 0.45359237
const KG_PER_TON = 2000 * KG_PER_LB
const DATE_HOUR_FMT = d3.timeFormat('%Y-%m-%d %H:%M')

const CONFIG = {
  'co2': {
    accessor: d => KG_PER_TON * d.co2_mass / d.gen,
    name: 'CO<sub>2</sub>',
    units: 'kg/MWh',
  },
  'so2': {
    accessor: d => KG_PER_LB * d.so2_mass / d.gen,
    name: 'SO<sub>2</sub>',
    units: 'lbs/MWh',
  },
}

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

function newTrace(data, gas) {
  var dataCopy = data.slice()
  shuffle(dataCopy)
  return {
    x: jitter(dataCopy.map(d => d.cf), 0.005),
    y: dataCopy.map(CONFIG[gas].accessor),
    type: 'scattergl',
    text: dataCopy.map(d => DATE_HOUR_FMT(d.datetime)),
    mode: 'markers',
    hoverinfo: 'x+y+text',
    hoverlabel: {font: DEFAULTS.STD_FONT},
    marker: {
      'size': 3.5,
      'color': dataCopy.map(d => d.datetime.getFullYear()),
      'colorscale': 'Viridis',
      'showscale': true,
    }
  }
}

module.exports = (divId, data, gas) => {
  var traces = []
  if (data.length > 0) {
    const maxGen = data.map(d => d.gen).reduce((a, b) => Math.max(a, b))
    data.forEach(d => d.cf = d.gen / maxGen)
    traces.push(newTrace(data.filter(d => d.cf > 0.02), gas))
  }
  const layout = {
    title: {
      text: `${CONFIG[gas].name} intensity vs capacity factor`,
    },
    autosize: true,
    showlegend: false,
    xaxis: {title: 'Capacity Factor'},
    yaxis: {title: `${CONFIG[gas].name} intensity (${CONFIG[gas].units})`},
    font: DEFAULTS.STD_FONT,
    margin: DEFAULTS.STD_MARGIN,
  }
  Plotly.react(divId, traces, layout, {displaylogo: false})
}
