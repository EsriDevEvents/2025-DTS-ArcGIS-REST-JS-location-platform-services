import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { closestFacility } from "@esri/arcgis-rest-routing";


// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.5.1/assets",
});

const coffeeShops = {
  features: [
    {
      geometry: {
        x: -116.542416,
        y: 33.825246,
      },
      attributes: {
        name: "Java Caliente Café",
        streetAddress: "401 E Amado Rd",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      },
    },
    {
      geometry: {
        x: -116.541144,
        y: 33.823428,
      },
      attributes: {
        name: "Koffi",
        streetAddress: "600 E Tahquitz Canyon Way",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
        },
    },
    {
      geometry: {
        x: -116.546391,
        y: 33.826196,
      },
      attributes: {
        name: "Gré Coffeehouse & Art Gallery",
        streetAddress: "278 N Palm Canyon Dr",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
    {
      geometry: {
        x: -116.54639,
        y: 33.826737,
      },
      attributes: {
        name: "Cravings Coffee And Pastries",
        streetAddress: "102 E Amado Rd Ste A",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
    {
      geometry: {
        x: -116.547101,
        y: 33.827683,
      },
      attributes: {
        name: "Mon Amour Cafe",
        streetAddress: "333 N Palm Canyon Dr",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
    {
      geometry: {
        x: -116.547103,
        y: 33.828498,
      },
      name: "Bluebird Days",
      attributes: {
        streetAddress: "395 N Palm Canyon Dr",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      },
    },
    {
      geometry: {
        x: -116.54704,
        y: 33.822918,
      },
      attributes: {
        name: "Starbucks Reserve",
        streetAddress: "101 S Palm Canyon Dr",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
    {
      geometry: {
        x: -116.546569,
        y: 33.821885,
      },
      attributes: {
        name: "Grand Central Palm Springs",
        streetAddress: "160 La Plaza",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
    {
      geometry: {
        x: -116.547227,
        y: 33.82272,
      },
      attributes: {
        name: "Acai Oasis LLC",
        streetAddress: "144 S Palm Canyon Dr",
        locality: "Palm Springs",
        region: "CA",
        postcode: "92262",
        country: "US",
      }
    },
  ],
};

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

const directions = document.getElementById("directions");
directions.innerHTML =
  "Click on the map to set an incident location.";

// Configure custom icon for coffeeshop points. https://developers.arcgis.com/documentation/mapping-and-location-services/place-finding/place-icons/
const customIcon = L.icon({
  iconUrl: "./src/Coffee_or_Tea_15.svg",
  iconSize: [38, 95]
});

let startPoint;

function findCoffeeShop() {
  closestFacility({
    incidents: [startPoint],
    facilities: coffeeShops,
    authentication,
    returnDirections: true,
    returnCFRoutes: true
  }).then((response) => {
    routeLines.clearLayers();

    L.geoJSON(response.routes.geoJson).addTo(routeLines);
    response.facilities.features.forEach((facility) => {
      const coordinates = [facility.geometry.y, facility.geometry.x];
      L.marker(coordinates, { icon: customIcon }).addTo(endLayerGroup);
    });

    // use the response data to display the directions' features
    const directionsHTML = response.directions[0].features
      .map((f) => `<li>${f.attributes.text}</li>`)
      .join("<br/>");
    directions.innerHTML = `<ul class="directions-list">${directionsHTML}</ul>`;

    startPoint = null;
  }).catch((error) => {
    console.error(`Error: ${error}`);
  });
}


map.on("click", (e) => {
  startLayerGroup.clearLayers();
  endLayerGroup.clearLayers();
  routeLines.clearLayers();

  const coordinates = [e.latlng.lng, e.latlng.lat];

  L.marker(e.latlng).addTo(startLayerGroup);
  startPoint = coordinates;

  findCoffeeShop();

});