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

const wikiMapTiles = L.tileLayer.provider('Wikimedia');
const earthAtNightTiles = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012');
const satelliteTiles = L.tileLayer.provider('Esri.WorldImagery');
const baseMaps = {
  "map": wikiMapTiles,
  "night": earthAtNightTiles,
  "satellite": satelliteTiles,
};
const legend = L.control({position: 'bottomright'});


legend.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'map-legend');
  var rows = ""
  for (const fuel_source in colors) {
    rows += `<tr><td><i style=\"background: ${colors[fuel_source]}\"></i></td>`;
    rows += `<td>${fuel_source}</td></tr>`;
  }
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
    className: "power-plant-marker",
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
  <table class=\"plant-props-table\">
  <tr><td class=\"info-header\">Capacity:</td><td>${capacity}</td></tr>
  <tr><td class=\"info-header\">Primary fuel:</td><td>${props.fuel_source}</td></tr>
  <tr><td class=\"info-header\">Operator:</td><td>${props.operator}</td></tr>
  <tr><td class=\"info-header\">County:</td><td>${props.county}</td></tr>
  <tr><td class=\"info-header\">ORISPL code:</td><td>${props.orispl_code}</td></tr>
  </table>
  <h4>Monthly gross load trend (MW)</h4>
  <div id=\"gload-trend-${props.orispl_code}\" class=\"plot-container\"></div>
  <h4>Mean hourly emissions</h4>
  <div id=\"mean-hourly-emis-${props.orispl_code}\" class=\"plot-container\"></div>
  <a class="monthly-data-download" href="csv/monthly/${props.orispl_code}.csv">Download this data (csv)</a>`;
  return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

function stateAggregatePopup(props) {
  const statePostalCode = props.code.toLowerCase();
  const htmlContent = `<h3>${props.name}</h3>
  <h4>Monthly gross load trend (MW)</h4>
  <div id=\"gload-trend-${statePostalCode}" class=\"plot-container\"></div>
  <h4>Mean hourly emissions</h4>
  <div id=\"mean-hourly-emis-${statePostalCode}\" class=\"plot-container\"></div>
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
  layers: [wikiMapTiles],
});

const powerPlantsGeoJson = L.geoJSON(powerPlants, {
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

const stateMarkersGeojson = L.geoJSON(stateMarkers, {
  onEachFeature: function(feature, layer) {
    layer.bindTooltip(feature.properties.name);
    layer.bindPopup(stateAggregatePopup(feature.properties))
    .on('popupopen', function(e) {
      renderPlots(feature.properties.code.toLowerCase());
    });
  }
})

L.control.layers(baseMaps, [], {position: 'topright'}).addTo(map);
L.control.zoom({position: 'topright'}).addTo(map);
legend.addTo(map);
powerPlantsGeoJson.addTo(map);
stateMarkersGeojson.addTo(map);

$('#facility-vizmetric-selector').change(function(){
  plants = powerPlantsGeoJson.getLayers()
  for (i = 0; i < plants.length; i++) {
    props = plants[i].feature.properties
    plants[i]._path.style['transition'] = 'd 0.6s'
    plants[i]._path.style['-webkit-transition'] = 'd 0.6s'
    radiusBasis = $(this).val()
    if (radiusBasis == "capacity") {
      plants[i].setRadius(getRadiusBasedOnCapacity(props.capacity))
    } else if (radiusBasis == "emissions") {
      plants[i].setRadius(getRadiusBasedOnEmissions(props.total_co2_emissions))
    }

  }
  setTimeout(() => {
    for (i = 0; i < plants.length; i++) {
      plants[i]._path.style['transition'] = '';
      plants[i]._path.style['-webkit-transition'] = '';
    }
  }, 600)
});
