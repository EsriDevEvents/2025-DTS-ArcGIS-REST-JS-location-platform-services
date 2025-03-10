import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { solveRoute } from "@esri/arcgis-rest-routing";

// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.5.1/assets",
});

// Create a new authentication from API key stored in the .env file
const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
const authentication = ApiKeyManager.fromKey(apiKey);

const map = L.map("map", {
  minZoom: 2,
});

map.setView([33.8258, -116.5392], 16);

// const basemapEnum = "arcgis/midcentury";
const basemapEnum = "arcgis/navigation";

L.esri.Vector.vectorBasemapLayer(basemapEnum, { token: apiKey }).addTo(map);

const startLayerGroup = L.layerGroup().addTo(map);
const endLayerGroup = L.layerGroup().addTo(map);

const routeLines = L.layerGroup().addTo(map);

const directions = document.getElementById("directions")
directions.innerHTML =
  "Click on the map to create a start and end for the route.";


let currentStep = "start";
let startCoords, endCoords;

function updateRoute() {
  solveRoute({
    stops: [startCoords, endCoords],
    authentication,
    // Allows any additional parameters not explicitly supported by rest-js to be passed to the REST API's underlying request
    params: {
      findBestSequence: true,
    },
    // This is the default endpoint for solveRoute but we can pass a different one in here
    // endpoint: "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve",
  })
    .then((response) => {
      routeLines.clearLayers();
      L.geoJSON(response.routes.geoJson).addTo(routeLines);

      // use the response data to display the directions' features
      const directionsHTML = response.directions[0].features
        .map((f) => `<li>${f.attributes.text}</li>`)
        .join("<br/>");
      directions.innerHTML = `<ul class="directions-list">${directionsHTML}</ul>`;
      startCoords = null;
      endCoords = null;
    })
    .catch((error) => {
      console.error(`Error: ${error}`);
    });
}

map.on("click", (e) => {
  const coordinates = [e.latlng.lng, e.latlng.lat];

  if (currentStep === "start") {
    startLayerGroup.clearLayers();
    endLayerGroup.clearLayers();
    routeLines.clearLayers();

    L.marker(e.latlng).addTo(startLayerGroup);
    startCoords = coordinates;

    currentStep = "end";
  } else {
    L.marker(e.latlng).addTo(endLayerGroup);
    endCoords = coordinates;
    currentStep = "start";
  }
  if (startCoords && endCoords) {
    updateRoute();
  }
});
