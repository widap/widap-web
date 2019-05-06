import L from 'leaflet';
import $ from './jq.js';
import powerPlantsGeoJson from './plants.json';
import stateMarkersGeoJson from './statemarkers.json';
import renderMonthlyGloadTrendPlot from './monthly-gload-trend.js';
import renderMonthlyEmissionsTimeSeries from './emissions-time-series-monthly.js';
import './leaflet-providers.js';

const WIDAP_SITE = "http://web.stanford.edu/group/widap";

// Used only for marker display colors.
const fuel_source_abbrevs = {
  "coal": "coal",
  "natural gas": "natural gas",
  "pipeline natural gas": "natural gas",
  "other gas": "natural gas",
  "wood": "wood",
  "process gas": "gas",
  "petroleum coke": "other",
  "other": "other",
  "": "other",
}

const colors = {
  "coal": "#830",
  "natural gas": "#369",
  "wood": "#363",
  "other": "#AAA",
}

const mapboxTiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    id: 'mapbox/light-v10',
    accessToken: 'NEED A LEGIT KEY HERE',
});
const earthAtNightTiles = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012');
const satelliteTiles = L.tileLayer.provider('Esri.WorldImagery');
const baseMaps = {
  "map": mapboxTiles,
  "night": earthAtNightTiles,
  "satellite": satelliteTiles,
};
const legend = L.control({position: 'bottomright'});

const WI_GEOJSON = {
  "type": "Feature",
  "properties": {
    "name": "Western Interconnection",
    "code": "interconnect",
  },
  "geometry": {
    "type": "Point",
    "coordinates": [
      -113.586097,
      41.951528,
    ],
  },
};

legend.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'map-legend');
  var rows = ""
  for (const fuel_source in colors) {
    rows += `<tr><td><i style="background: ${colors[fuel_source]}"></i></td>`;
    rows += `<td>${fuel_source}</td></tr>`;
  }
  rows += `<tr><td><i style="background: rgb(230, 200, 0)"></i></td><td>state totals</td></tr>`;
  rows += `<tr><td><i style="background: rgb(180, 0, 100)"></i></td><td>WI totals</td></tr>`;
  div.innerHTML += "<table>" + rows + "</table>"
  return div;
};

function getRadiusBasedOnCapacity(cap) {
  return (cap > 0 ? 4.0 + (Math.pow(cap, 0.54) / 3.7) : 4.0);
}

function getRadiusBasedOnEmissions(emissions) {
  return (emissions > 0 ? 4.0 + (Math.pow(emissions, 0.54) / 1200) : 4.0)
}

function powerPlantMarkerOptions(props) {
  return {
    className: "map-marker power-plant-marker",
    fillColor: colors[fuel_source_abbrevs[props.fuel_source.toLowerCase()]],
    radius: getRadiusBasedOnCapacity(props.capacity),
  };
}

function renderPlots(entityId) {
  Plotly.d3.csv(`csv/monthly/${entityId}.csv`, (err, data) => {
    renderMonthlyGloadTrendPlot(`gload-trend-${entityId}`, data)
    renderMonthlyEmissionsTimeSeries(`mean-hourly-emis-${entityId}`, data)
  });
}

function powerPlantPopup(props) {
  var capacity = props.capacity;
  if (capacity != "unknown") {
    capacity = capacity + " MW";
  }
  const htmlContent = `<h3>${props.name}</h3>
  <table class="plant-props-table">
  <tr><td class="info-header">Capacity:</td><td>${capacity}</td></tr>
  <tr><td class="info-header">Primary fuel:</td><td>${props.fuel_source}</td></tr>
  <tr><td class="info-header">Operator:</td><td>${props.operator}</td></tr>
  <tr><td class="info-header">County:</td><td>${props.county}</td></tr>
  <tr><td class="info-header">ORISPL code:</td><td>${props.orispl_code}</td></tr>
  </table>
  <h4>Monthly gross load trend (MW)</h4>
  <div id="gload-trend-${props.orispl_code}" class="plot-container"></div>
  <h4>Mean hourly emissions</h4>
  <div id="mean-hourly-emis-${props.orispl_code}" class="plot-container"></div>
  <div><a href="${WIDAP_SITE}/unit_level_dashboard.html?orispl_code=${props.orispl_code}" target="_blank">Explore this plant in more detail &raquo;</a></div>
  <div><a class="monthly-data-download" href="${WIDAP_SITE}/csv/monthly/${props.orispl_code}.csv">Download this data (csv)</a></div>`;
  return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

function stateAggregatePopup(props) {
  const statePostalCode = props.code.toLowerCase();
  const htmlContent = `<h3>${props.name}</h3>
  <h4>Monthly gross load trend (MW)</h4>
  <div id="gload-trend-${statePostalCode}" class="plot-container"></div>
  <h4>Mean hourly emissions</h4>
  <div id="mean-hourly-emis-${statePostalCode}" class="plot-container"></div>
  <a class="monthly-data-download" href="csv/monthly/${statePostalCode}.csv">Download this data (csv)</a>`;
  return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

const map = L.map('power-plants-map', {
  center: [40.0, -115.0],
  minZoom: 2,
  zoom: 5,
  zoomDelta: 0.5,
  zoomSnap: 0.5,
  zoomControl: false,
  layers: [mapboxTiles],
});

let powerPlants = L.geoJSON(powerPlantsGeoJson, {
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng, powerPlantMarkerOptions(feature.properties))
      .bindTooltip(feature.properties.name)
      .bindPopup(powerPlantPopup(feature.properties))
      .on('popupopen', function(e) {
        L.DomUtil.addClass(e.target._path, 'selected');
        renderPlots(feature.properties.orispl_code)
      })
      .on('popupclose', function(e) {
        L.DomUtil.removeClass(e.target._path, 'selected');
      });
  }
})

const stateMarkerOpts = {
  className: 'map-marker aggregate-map-marker',
  fillColor: 'rgba(240, 200, 0)',
  radius: 12,
}
const stateMarkers = L.geoJSON(stateMarkersGeoJson, {
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng, stateMarkerOpts)
      .bindTooltip(feature.properties.name)
      .bindPopup(stateAggregatePopup(feature.properties))
      .on('popupopen', function(e) {
        L.DomUtil.addClass(e.target._path, 'selected');
        renderPlots(feature.properties.code.toLowerCase());
      })
      .on('popupclose', function(e) {
        L.DomUtil.removeClass(e.target._path, 'selected');
      });
  },
});

const wiMarkerOpts = {
  className: 'map-marker aggregate-map-marker',
  fillColor: 'rgba(180, 0, 100)',
  radius: 12,
}
const wiMarker = L.geoJSON(WI_GEOJSON, {
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng, wiMarkerOpts)
      .bindTooltip(feature.properties.name)
      .bindPopup(stateAggregatePopup(feature.properties))
      .on('popupopen', function(e) {
        L.DomUtil.addClass(e.target._path, 'selected');
        renderPlots(feature.properties.code.toLowerCase());
      })
      .on('popupclose', function(e) {
        L.DomUtil.removeClass(e.target._path, 'selected');
      });
  },
});

L.control.layers(baseMaps, [], {position: 'topright'}).addTo(map);
L.control.zoom({position: 'topright'}).addTo(map);
legend.addTo(map);
powerPlants.addTo(map);
stateMarkers.addTo(map);
wiMarker.addTo(map);

$('facility-vizmetric-selector').onchange = (e) => {
  var plants = powerPlants.getLayers();
  for (let plant of plants) {
    let props = plant.feature.properties;
    plant._path.style['transition'] = 'd 0.6s';
    plant._path.style['-webkit-transition'] = 'd 0.6s';
    let radiusBasis = e.target.value;
    if (radiusBasis == "capacity") {
      plant.setRadius(getRadiusBasedOnCapacity(props.capacity));
    } else if (radiusBasis == "emissions") {
      plant.setRadius(getRadiusBasedOnEmissions(props.total_co2_emissions));
    }

  }
  setTimeout(() => {
    for (let plant of plants) {
      plant._path.style['transition'] = '';
      plant._path.style['-webkit-transition'] = '';
    }
  }, 600)
};
