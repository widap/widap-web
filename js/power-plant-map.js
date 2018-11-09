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
    "grayscale": grayscaleTiles,
    "satellite": satelliteTiles,
    "night": earthAtNightTiles,
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

var openSidebar = function() {
    $("#open-sidebar-link").removeClass("visible").addClass("hidden");
    $("#close-sidebar-link").removeClass("hidden").addClass("visible");
    $("#info-sidebar").removeClass("sidebar-closed").addClass("sidebar-open");
}
var closeSidebar = function() {
    $("#close-sidebar-link").removeClass("visible").addClass("hidden");
    $("#open-sidebar-link").removeClass("hidden").addClass("visible");
    $("#info-sidebar").removeClass("sidebar-open").addClass("sidebar-closed");
}
$("#open-sidebar-link").click(openSidebar);
$("#close-sidebar-link").click(closeSidebar);

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

// TODO: Get rid of all the <br /> tags! Find a better layout option.
function displayPlantInfo(props) {
    plantOverviewPlotData = d3.json(`http://localhost:8000/web/data/overview/${props.orispl_code}.json`);
    $("#info-display-container").html(`<h4>${props.name}</h4>
Capacity: ${props.capacity}MW<br />
Primary fuel: ${props.fuel_source}<br />
Operator: ${props.operator}<br />
County: ${props.county}<br />
ORISPL code: ${props.orispl_code}<br />
<svg id=\"overview-boxplot\" width=400 height=200 />
<a href=\"#\">Download this data</a>`);
    plantOverviewPlotData.then(
        data => renderMonthlyGloadBoxPlot(
            data.monthly_gload_quartiles,
            "overview-boxplot",
            {top: 20, right: 30, bottom: 30, left: 40}));
}

map = L.map('power-plants-map', {
    center: [40.0, -115.0],
    minZoom: 2,
    zoom: 5,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    zoomControl: false,
    layers: [grayscaleTiles],
});


powerPlantsGeoJson = L.geoJSON(powerPlants, {
    pointToLayer: function(feature, latlng) {
        // Hijacks popup click functionality to display plant info in sidebar.
        return L.circleMarker(latlng, powerPlantMarkerOptions(feature.properties))
            .bindTooltip(feature.properties.name)
            .bindPopup(L.popup({className: "hidden"}).setContent(""))
                .on('popupopen', function(e) {
                    openSidebar();
                    displayPlantInfo(feature.properties);
                    L.DomUtil.addClass(e.target._path, 'selected');
                    // map.flyTo(latlng);
                })
                .on('popupclose', function(e) {
                    L.DomUtil.removeClass(e.target._path, 'selected');
                    closeSidebar();
                });
    }
})

layerControl.addTo(map);
zoomControl.addTo(map);
legend.addTo(map);
powerPlantsGeoJson.addTo(map);

// var statePolygons = L.geoJSON(wiebStatePolys, {
//     style: function(feature) {
//         return {
//             "weight": 2,
//             "color": "#999",
//             "opacity": 0.1,
//             "fillColor": "#888",
//             "fillOpacity": 0.2
//         }
//     }
// });
// statePolygons.addTo(map);
