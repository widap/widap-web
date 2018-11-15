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
    "coal": "#333",
    "natural gas": "#369",
    "wood": "#C60",
    "other": "#AAA",
}

// Declare all vars up front in case they get used in functions.
var map, powerPlantsGeoJson;
var grayscaleTiles = L.tileLayer.provider('Esri.WorldGrayCanvas');
var satelliteTiles = L.tileLayer.provider('Esri.WorldImagery');
var earthAtNightTiles = L.tileLayer.provider('NASAGIBS.ViirsEarthAtNight2012');
var baseMaps = {
    "night": earthAtNightTiles,
    "grayscale": grayscaleTiles,
    "satellite": satelliteTiles,
};
var layerControl = L.control.layers(baseMaps, [], {position: 'topright'});
var zoomControl = L.control.zoom({position: 'topright'});
var legend = L.control({position: 'bottomright'});


legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'map-legend');
    for (var fuel_source in colors) {
        div.innerHTML += "<i style=\"background: "
            + colors[fuel_source] + "\"></i>" + fuel_source + "<br />";
    }
    return div;
};

function getRadius(cap) {
    return (cap > 0 ? 4.0 + (Math.pow(cap, 0.54) / 3.7) : 4.0);
}

function powerPlantMarkerOptions(props) {
    return {
        className: "power-plant-marker",
        fillColor: colors[fuel_source_abbrevs[props.fuel_source.toLowerCase()]],
        radius: getRadius(props.capacity),
    };
}

function powerPlantPopup(props) {
    htmlContent = `<h3>${props.name}</h3>
<table class=\"plant-props-table\">
  <tr>
    <tr><td class=\"info-header\">Capacity:</td><td>${props.capacity}MW</td></tr>
    <tr><td class=\"info-header\">Primary fuel:</td><td>${props.fuel_source}</td></tr>
    <tr><td class=\"info-header\">Operator:</td><td>${props.operator}</td></tr>
    <tr><td class=\"info-header\">County:</td><td>${props.county}</td></tr>
    <tr><td class=\"info-header\">ORISPL code:</td><td>${props.orispl_code}</td></tr>
  </tr>
</table>
<h4>Average monthly load (MW)</h4>
<svg id=\"overview-boxplot-${props.orispl_code}\" width=480 height=250 />
<h4>Average normalized monthly emissions (SO2, NOx, CO2)</h4>
<svg id=\"overview-normalized-emissions-${props.orispl_code}\" width=480 height=250 />
<div><a href=\"#\">Explore this plant</a></div>
<div><a href=\"#\">Download this data</a></div>`;
    return L.popup({maxHeight: 500, minWidth: 500}).setContent(htmlContent);
}

function renderOverviewPlots(props) {
    d3.json(`http://localhost:8000/web/data/overview/${props.orispl_code}.json`)
        .then(
            data => {
                renderMonthlyGloadTrendLine(
                    data.monthly_gload_quartiles,
                    `overview-boxplot-${props.orispl_code}`,
                    {top: 20, right: 30, bottom: 30, left: 40});
                renderNormalizedEmissions(
                    data.normalized_emissions,
                    `overview-normalized-emissions-${props.orispl_code}`,
                    {top: 20, right: 30, bottom: 30, left: 40});
            });
}

map = L.map('power-plants-map', {
    center: [40.0, -115.0],
    minZoom: 2,
    zoom: 5,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    zoomControl: false,
    layers: [earthAtNightTiles],
});


powerPlantsGeoJson = L.geoJSON(powerPlants, {
    pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, powerPlantMarkerOptions(feature.properties))
            .bindTooltip(feature.properties.name)
            .bindPopup(powerPlantPopup(feature.properties))
            .on('popupopen', function(e) {
                // TODO: Pre-render SVGs. They're a bit slow.
                renderOverviewPlots(feature.properties);
                L.DomUtil.addClass(e.target._path, 'selected');
            })
            .on('popupclose', function(e) {
                L.DomUtil.removeClass(e.target._path, 'selected');
            });
    }
})


var statePolygons = L.geoJSON(wiebStatePolys, {
    style: function(feature) {
        return {
            "weight": 2,
            "color": "#999",
            "opacity": 0.25,
            "fillColor": "#888",
            "fillOpacity": 0.2
        }
    }
});

layerControl.addTo(map);
zoomControl.addTo(map);
legend.addTo(map);
statePolygons.addTo(map);
powerPlantsGeoJson.addTo(map);