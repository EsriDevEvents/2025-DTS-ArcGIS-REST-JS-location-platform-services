import "@esri/calcite-components/dist/calcite/calcite.css";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import {
  getCategories,
  findPlacesWithinExtent,
  findPlacesNearPoint,
  getPlaceDetails,
} from "@esri/arcgis-rest-places";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { vectorBasemapLayer } from "esri-leaflet-vector";

// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/3.0.3/assets",
});

const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
const authentication = ApiKeyManager.fromKey(apiKey);

const { categories } = await getCategories({
  authentication,
  icon: "png",
});

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const closeButton = document.getElementById("closeButton");
const flowPanel = document.getElementById("flowPanel");
const resultsList = document.getElementById("resultList");
const resultsFlowItem = document.getElementById("resultsFlowItem");
const alert = document.getElementById("alert");

// Buttons
const placeTypes = [
  {
    name: "Default",
    isButton: false,
    categoryIds: "",
    icon: "https://static.arcgis.com/icons/places/Default_15.svg",
  },
  {
    name: "Restaurants",
    categoryIds: ["4d4b7105d754a06374d81259"],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Restaurant_15.svg",
  },
  {
    name: "Hotels",
    categoryIds: [
      "4bf58dd8d48988d1fa931735",
      "4bf58dd8d48988d1e9941735",
      "4bf58dd8d48988d12f951735",
    ],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Lodging_15.svg",
  },
  {
    name: "Grocery",
    categoryIds: [
      "4bf58dd8d48988d118951735",
      "52f2ab2ebcbc57f1066b8b45",
      "50aa9e744b90af0d42d5de0e",
      "52f2ab2ebcbc57f1066b8b2c",
      "5f2c41945b4c177b9a6dc7d6",
      "63be6904847c3692a84b9bf0",
    ],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Grocery_Store_15.svg",
  },
  {
    name: "Coffee",
    categoryIds: ["4bf58dd8d48988d1e0931735", "5e18993feee47d000759b256"],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Coffee_or_Tea_15.svg",
  },
  {
    name: "ATM",
    categoryIds: ["52f2ab2ebcbc57f1066b8b56"],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Bank_15.svg",
  },
  {
    name: "Parks",
    categoryIds: [
      "4bf58dd8d48988d163941735",
      "63be6904847c3692a84b9be0",
      "4bf58dd8d48988d1e7941735",
      "63be6904847c3692a84b9be1",
    ],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Park_15.svg",
  },
  {
    name: "Fuel",
    categoryIds: ["4bf58dd8d48988d113951735", "5032872391d4c4b30a586d64"],
    isButton: true,
    icon: "https://static.arcgis.com/icons/places/Gas_Station_15.svg",
  },
];

let processing = false;
let flowItem;

let activePlaceType = getPlaceType("Restaurants");
searchInput.value = activePlaceType.name;
let activeSearchText = null;
let activeLocation = null;
const radiusBase = 100;
const pageSize = 20;

placeTypes.forEach((placeType) => {
  if (!placeType.isButton) return;
  const categoryButton = L.DomUtil.create("calcite-chip", "categoryButton");
  categoryButton.setAttribute("scale", "m");
  categoryButton.setAttribute("kind", "neutral");
  categoryButton.setAttribute("appearance", "outline");
  categoryButton.setAttribute("value", placeType.name);
  categoryButton.innerHTML = placeType.name;

  if (placeType.name === "Restaurants") {
    categoryButton.setAttribute("selected", true);
  }

  categoryButton.addEventListener("calciteChipSelect", (e) => {
    if (processing) return;
    searchInput.value = placeType.name;
    activeSearchText = ""; // Don't use search text for strict searches
    activePlaceType = getPlaceType(e.currentTarget.value);
    getPlacesExtent();
  });

  const buttonAvatar = L.DomUtil.create("calcite-avatar");
  buttonAvatar.setAttribute("slot", "image");
  buttonAvatar.setAttribute("scale", "m");

  // get the icon url
  let icon = categories.find(
    (elt) => elt.categoryId == placeType.categoryIds[0]
  ).icon.url;

  buttonAvatar.setAttribute("thumbnail", icon);
  categoryButton.append(buttonAvatar);

  categoryButtons.append(categoryButton);
});

function getPlaceType(name) {
  return placeTypes.find((placeType) => placeType.name === name);
}

const map = L.map("map", {
  minZoom: 13,
  maxZoom: 18,
}).setView([34.0566, -117.195], 14); // Redlands, California

const basemapEnum = "arcgis/navigation";

vectorBasemapLayer(basemapEnum, {
  apiKey: apiKey,
}).addTo(map);

map.zoomControl.setPosition("bottomright");

const radiusLayer = L.layerGroup().addTo(map);
const placesLayer = L.layerGroup().addTo(map);

// Get places in the map extent
async function getPlacesExtent() {
  if (!processing) {
    processing = true;
  } else {
    return;
  }

  clearPlaces();
  resetSearch(true);
  showAlert(false);
  radiusLayer.clearLayers();

  console.log("getPlacesExtent:" + activePlaceType);

  const bounds = map.getBounds();
  const topRight = bounds.getNorthEast();
  const bottomLeft = bounds.getSouthWest();
  const params = {
    xmin: bottomLeft.lng,
    ymin: bottomLeft.lat,
    xmax: topRight.lng,
    ymax: topRight.lat,
    categoryIds: activePlaceType.categoryIds,
    searchText: activeSearchText,
    pageSize,
    authentication,
    icon: "png",
  };

  try {
    let response = await findPlacesWithinExtent(params);

    if (response.results.length > 0) {
      showPanel(true);
      response.results.forEach((searchResult) => {
        addMarker(searchResult);
        addSearchResult(searchResult);
      });
      while (response.nextPage) {
        response = await response.nextPage();
        response.results.forEach((searchResult) => {
          addMarker(searchResult);
          addSearchResult(searchResult);
        });
      }
    } else {
      showPanel(false);
      showAlert(true);
    }
  } catch (err) {
    showPanel(false);
    showAlert(true);
    console.log(err);
  }
  processing = false;
}

// Get places near the click point
async function getPlacesNearby(latLng) {
  if (!processing) {
    processing = true;
  } else {
    return;
  }

  clearPlaces();
  showAlert(false);

  const params = {
    x: latLng.lng,
    y: latLng.lat,
    categoryIds: activePlaceType.categoryIds,
    searchText: activeSearchText,
    radius: getRadius(),
    pageSize,
    authentication,
  };

  try {
    let response = await findPlacesNearPoint(params);
    if (response.results.length > 0) {
      showPanel(true);
      response.results.forEach((searchResult) => {
        addMarker(searchResult);
        addSearchResult(searchResult);
      });

      while (response.nextPage) {
        response = await response.nextPage();
        response.results.forEach((searchResult) => {
          addMarker(searchResult);
          addSearchResult(searchResult);
        });
      }
    } else {
      showPanel(false);
      showAlert(true);
    }
  } catch (err) {
    showPanel(false);
    showAlert(true);
    console.log(err);
  }
  processing = false;
}

function addMarker(searchResult) {
  let icon = getIconMarkerLookUp(searchResult.categories);

  const marker = L.marker([searchResult.location.y, searchResult.location.x], {
    autoPan: true,
    icon: icon,
  })
    .bindPopup(
      "<b>" + searchResult.name + "</b></br>" + searchResult.categories[0].label
    )
    .on("click", clickZoom)
    .addTo(placesLayer);
  marker.id = searchResult.placeId; // set place id
}

function getIconMarkerLookUp(forCategory) {
  let icon = categories.find((elt) => {
    return forCategory[0].categoryId == elt.categoryId;
  }).icon.url;

  const iconMarker = `<img src="${icon}" width="21px" height="21px">`;
  return L.divIcon({
    html: iconMarker,
    className: "marker-icon",
    iconAnchor: [10, 13],
    popupAnchor: [0, -12],
  });
}

function findMarker(id) {
  return placesLayer.getLayers().find((item) => item.id === id);
}

// Add each place to the result panel
function addSearchResult(searchResult) {
  const item = document.createElement("calcite-list-item");
  item.label = searchResult.name;
  item.description = searchResult.categories[0].label;
  item.id = searchResult.placeId;
  item.addEventListener("click", (e) => {
    getAllPlaceDetails(searchResult.placeId);
    goToPlace(searchResult.placeId, true);
  });
  resultsList.append(item);
}

// Get place details and display
async function getAllPlaceDetails(id) {
  const params = {
    placeId: id,
    requestedFields: ["all"],
    authentication,
  };
  try {
    const result = await getPlaceDetails(params).then((result) => {
      console.log(result);
      showDetails(result.placeDetails);
    });
  } catch (err) {
    console.log(err);
  }
}

function showDetails(placeDetails) {
  if (flowItem) {
    flowItem.remove();
  }
  flowItem = document.createElement("calcite-flow-item");
  flowItem.setAttribute("id", placeDetails.placeId);
  flowItem.heading = placeDetails.name;
  flowItem.description = formatCategoryNames(placeDetails.categories);
  addBlock("Description", "information", placeDetails?.description);
  addBlock("Address", "map-pin", placeDetails?.address?.streetAddress);
  addBlock("Phone", "mobile", placeDetails?.contactInfo?.telephone);
  addBlock("Hours", "clock", placeDetails?.hours?.openingText);
  addBlock("Rating", "star", placeDetails?.rating?.user);
  addBlock("Email", "email-address", placeDetails?.contactInfo?.email);
  addBlock(
    "Website",
    "information",
    placeDetails?.contactInfo?.website?.split("://")[1].split("/")[0]
  );
  addBlock(
    "Facebook",
    "speech-bubble-social",
    placeDetails?.socialMedia?.facebookId
      ? `www.facebook.com/${placeDetails.socialMedia.facebookId}`
      : null
  );
  addBlock(
    "Twitter",
    "speech-bubbles",
    placeDetails?.socialMedia?.twitter
      ? `www.twitter.com/${placeDetails.socialMedia.twitter}`
      : null
  );
  addBlock(
    "Instagram",
    "camera",
    placeDetails?.socialMedia?.instagram
      ? `www.instagram.com/${placeDetails.socialMedia.instagram}`
      : null
  );
  flowItem.addEventListener("calciteFlowItemBack", closeItem);
  flowPanel.append(flowItem);
  flowItem.selected = true;
  resultsFlowItem.selected = false;
}

function formatCategoryNames(categories) {
  let categoryLabel = "";
  categories.forEach((category, i) => {
    categoryLabel += `${category.label} (${category.categoryId})`;
    categoryLabel += i < categories.length - 1 ? ", " : "";
  });
  return categoryLabel;
}

function addBlock(heading, icon, validValue) {
  console.log(heading, icon, validValue);
  if (validValue) {
    const element = document.createElement("calcite-block");
    console.log(element);
    element.heading = heading;
    element.description = validValue;
    const attributeIcon = document.createElement("calcite-icon");
    attributeIcon.icon = icon;
    attributeIcon.slot = "icon";
    attributeIcon.scale = "m";
    element.append(attributeIcon);
    flowItem.append(element);
  }
}

function clearPlaces() {
  placesLayer.clearLayers();
  if (flowItem) flowItem.remove();
  resultsList.innerHTML = ""; // clear list
  map.closePopup();
}

function goToPlace(placeId, zoom) {
  const marker = findMarker(placeId);
  if (zoom) {
    map.flyTo(marker.getLatLng());
  }
  marker.openPopup();
}

function clickZoom(e) {
  getAllPlaceDetails(e.target.id, e.latLng);
}

function closeItem(item) {
  flowItem.selected = false;
  resultsFlowItem.selected = true;
  map.closePopup();
}

// Add circle to map and search
map.on("click", function (e) {
  if (processing) return;

  radiusLayer.clearLayers();
  resetSearch(true);

  L.circle(e.latlng, {
    stroke: 0,
    fillOpacity: 0.075,
    fillColor: "rgb(0,0,0)",
    radius: getRadius(),
  }).addTo(radiusLayer);

  getPlacesNearby(e.latlng);
});

function getRadius() {
  let radius = radiusBase * (Math.exp(map.getMaxZoom() - map.getZoom()) / 3);
  radius = radius < 1000 ? radius : 1000;
  return radius;
}

function showAlert(visible, message) {
  if (visible) {
    alert.removeAttribute("hidden");
    alert.open = true;
  } else {
    alert.open = false;
  }
}

function resetSearch(visible) {
  if (visible) {
    closeButton.classList.remove("hide");
  } else {
    closeButton.classList.add("hide");
  }
}

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    activeSearchText = searchInput.value;
    activePlaceType = getPlaceType("Default");
    getPlacesExtent();
  }
});

searchButton.addEventListener("click", (e) => {
  activeSearchText = searchInput.value;
  activePlaceType = getPlaceType("Default");
  getPlacesExtent();
});

closeButton.addEventListener("click", (e) => {
  activeSearchText = searchInput.value = "";
  activePlaceType = getPlaceType("Default");
  searchButton.classList.remove("hide");
  closeButton.classList.add("hide");
  radiusLayer.clearLayers();
  placesLayer.clearLayers();
  map.closePopup();
});

// Search on start up
getPlacesExtent();
