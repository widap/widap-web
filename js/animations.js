// TODO: Factor out code in common between this and power-plant-map.
class EasingCircleMarker extends L.CircleMarker {
  easeRadius = (r, durationMs) => {
    const rScale = r / this.getRadius();
     if (L.DomUtil.TRANSITION) {
      this._path.style[L.DomUtil.TRANSITION] = `transform ${durationMs}ms`;
    }
    this._path.style["transform-origin"] = `${this._point.x}px ${this._point.y}px`;
    this._path.style.transform = `scale(${rScale}, ${rScale}`;
  };
};

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

function color(props) {
  return colors[fuel_source_abbrevs[props.fuel_source.toLowerCase()]];
}

function plantMarkerOptions(props) {
  return {
    className: "power-plant-marker",
    fillColor: color(props),
    color: color(props),
    radius: radius(props),
  };
}

// TODO: This dimension of data will change over time!
function radius(props) {
  let cap = props.capacity;
  return (cap > 0 ? 4.0 + (Math.sqrt(cap) / 4.0) : 4.0);
}

function powerPlantPopup(props) {
  return new mapboxgl.Popup({ offset: 10 }).setHTML(props.name);
}

const map = L.map("map-container", {
  center: [40.5, -112.0],
  zoom: 5,
  // The following options basically make the map tile image static
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  dragging: false,
  keyboard: false,
});

L.tileLayer(
  'https://api.mapbox.com/styles/v1/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}',
  {
    id: 'mapbox/light-v10',
    attribution: '<a href="https://www.mapbox.com/">Mapbox</a>',
    accessToken: 'pk.eyJ1Ijoic2plc3BlcnNlbiIsImEiOiJjam5ld2w5ZnMxYjJ4M2ttcnE3cWF3cjF5In0.8QAIjNCdzUaAp_f-k580Uw',
  },
).addTo(map);

d3.json("js/plants.json").then(plants => {
  const plantsGeoJson = L.geoJSON(plants, {
    pointToLayer: (feature, latlng) =>
      new EasingCircleMarker(latlng, plantMarkerOptions(feature.properties))
          .bindTooltip(feature.properties.name),
  })
  plantsGeoJson.addTo(map);

  // TODO: Make animation not just on page load
  for (let p of plantsGeoJson.getLayers()) {
    setTimeout(() => {
      p.easeRadius(2.0 * radius(p.feature.properties), 1500);
      setTimeout(() => p.easeRadius(radius(p.feature.properties), 2000), 2500);
    }, 1500);
  }
});
