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

// Declare all vars up front in case they get used in functions.
var map, powerPlantsGeoJson;
var wikiMapTiles = L.tileLayer.provider('Wikimedia');
var earthAtNightTiles = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012');
var satelliteTiles = L.tileLayer.provider('Esri.WorldImagery');
var baseMaps = {
    "map": wikiMapTiles,
    "night": earthAtNightTiles,
    "satellite": satelliteTiles,
};
var legend = L.control({position: 'bottomright'});


legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'map-legend');
    var tableRows = ""
    for (var fuel_source in colors) {
        tableRows += "<tr><td><i style=\"background: "
            + colors[fuel_source] + "\"></i></td><td>" + fuel_source + "</td></tr>";
    }
    div.innerHTML += "<table>" + tableRows + "</table>"
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

function renderPlots(data, entityId) {
    const dt = data.map(d => d.year_month)
    const minTrace = {
        type: 'scatter',
        name: 'min',
        x: dt,
        y: data.map(d => d.min_gload_mw),
        line: {
          color: '#CCC',
          width: 0.5,
        },
    }
    const maxTrace = {
        type: 'scatter',
        name: 'max',
        x: dt,
        y: data.map(d => d.max_gload_mw),
        line: {
          color: '#CCC',
          width: 0.5,
        },
        fill: 'tonexty',
    }
    const q1Trace = {
        type: 'scatter',
        name: '25%',
        x: dt,
        y: data.map(d => d.q1_gload_mw),
        line: {
          color: '#999',
          width: 0.5,
        },
    }
    const q3Trace = {
        type: 'scatter',
        name: '75%',
        x: dt,
        y: data.map(d => d.q3_gload_mw),
        line: {
          color: '#999',
          width: 0.5,
        },
        fill: 'tonexty',
    }
    const q2Trace = {
        type: 'scatter',
        name: 'median',
        x: dt,
        y: data.map(d => d.q2_gload_mw),
        line: {
          color: 'steelblue',
          width: 1.8,
        },
    }
    const layout = {
        showlegend: false,
        font: {
            family: "'Source Sans Pro', 'Open Sans', sans-serif",
        },
        xaxis: {
            rangeslider: {},
            type: 'date',
        },
        margin: {
            l: 40,
            r: 10,
            t: 40,
            b: 10,
        },
    }
    Plotly.plot(
        `gload-trend-${entityId}`,
        [minTrace, maxTrace, q1Trace, q3Trace, q2Trace],
        layout,
        {displaylogo: false, responsive: true});
}

function fetchAndRenderPlots(entityId) {
    // if (plotsRendered.has(entityId)) {
        // return;
    // }
    Plotly.d3.csv(`http://localhost:8000/web/csv/monthly/${entityId}.csv`, (err, rows) => {
        renderPlots(rows, entityId)
        // plotsRendered.add(entityId)
    });
}

function powerPlantPopup(props) {
    capacity = props.capacity;
    if (capacity != "unknown") {
        capacity = capacity + " MW";
    }
    htmlContent = `<h3>${props.name}</h3>
<table class=\"plant-props-table\">
  <tr><td class=\"info-header\">Capacity:</td><td>${capacity}</td></tr>
  <tr><td class=\"info-header\">Primary fuel:</td><td>${props.fuel_source}</td></tr>
  <tr><td class=\"info-header\">Operator:</td><td>${props.operator}</td></tr>
  <tr><td class=\"info-header\">County:</td><td>${props.county}</td></tr>
  <tr><td class=\"info-header\">ORISPL code:</td><td>${props.orispl_code}</td></tr>
</table>
<h4>Monthly gross load trend (MW)</h4>
<div id=\"gload-trend-${props.orispl_code}\" height="360"></div>
<object type=\"image/svg+xml\" data=\"img/svg/emissions/${props.orispl_code}.svg\" height="360"></object>
<a class="monthly-data-download" href="csv/monthly/${props.orispl_code}.csv">Download this data (csv)</a>`;
    return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

function stateAggregatePopup(props) {
    statePostalCode = props.code.toLowerCase();
    // I don't understand why the &nbsp; is necessary, but it is!
    htmlContent = `<h3>${props.name}</h3>&nbsp;
<h4>Monthly gross load trend (MW)</h4>
<div id=\"gload-trend-${statePostalCode}" height="360"></div>
<object type=\"image/svg+xml\" data=\"img/svg/emissions/${statePostalCode}.svg\" width="500" height="360"></object>
<a class="monthly-data-download" href="csv/monthly/${statePostalCode}.csv">Download this data (csv)</a>`;
    return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

map = L.map('power-plants-map', {
    center: [40.0, -115.0],
    minZoom: 2,
    zoom: 5,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    zoomControl: false,
    layers: [wikiMapTiles],
});


powerPlantsGeoJson = L.geoJSON(powerPlants, {
    pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, powerPlantMarkerOptions(feature.properties))
            .bindTooltip(feature.properties.name)
            .bindPopup(powerPlantPopup(feature.properties))
            .on('popupopen', function(e) {
                L.DomUtil.addClass(e.target._path, 'selected');
                fetchAndRenderPlots(feature.properties.orispl_code);
            })
            .on('popupclose', function(e) {
                L.DomUtil.removeClass(e.target._path, 'selected');
            });
    }
})

stateMarkersGeojson = L.geoJSON(stateMarkers, {
    onEachFeature: function(feature, layer) {
        layer.bindTooltip(feature.properties.name);
        layer.bindPopup(stateAggregatePopup(feature.properties))
            .on('popupopen', function(e) {
                fetchAndRenderPlots(feature.properties.code.toLowerCase());
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
