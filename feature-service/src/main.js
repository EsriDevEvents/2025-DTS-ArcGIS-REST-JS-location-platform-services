import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";

import { queryFeatures, decodeValues } from "@esri/arcgis-rest-feature-service";

// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/3.0.3/assets",
});


const featureServiceUrl = "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Alternate_Fuel/FeatureServer/0";
const container = document.querySelector(".card-container");

// Get all features when we first load the application 
queryFeatures({ url: featureServiceUrl, resultRecordCount: 200, returnGeometry: false})
.then((queryResponse) => decodeValues({ url: featureServiceUrl, queryResponse }))
.then((data) => displayAllCards(data.features));

document.addEventListener("calciteChipGroupSelect", (e) => {
  container.replaceChildren("");
  const filters = e.target.selectedItems.map((selected) => selected.value);
  filterStations(filters);
});

function filterStations(fuels) {
  const queryString = fuels.length > 0 ? `Fuel_Type IN (${fuels
    .map((f) => `'${f}'`)
    .join(", ")})` : "";

  queryFeatures({
    url: featureServiceUrl,
    resultRecordCount: 200,
    where: queryString,
    returnGeometry: false,
  }).then((queryResponse) => decodeValues({ url: featureServiceUrl, queryResponse})).then((data) => {
    data.features.forEach(feature => {
      displayCard(feature.attributes);
    })
  })
}

function displayAllCards(features) {
  features.forEach((feature) => {
    displayCard(feature.attributes);
  })
}

function displayCard(station) {
  const {
    Station_Id,
    Station_Name,
    facility_type,
    Access_Hours,
    Fuel_Type, 
    Accessability,
    Address,
    City,
    State
  } = station;

  const hours = Access_Hours ? Access_Hours : "Access hours not provided";
  const card = `
    <calcite-card label=${Station_Id}>
      <h3 slot="heading">${Station_Name}</h3>
      <div slot="description">
        <p>${Address}, ${City}, ${State}</span>
        </p>
        <p>${facility_type}</p>
        <p>${hours}</p>
      </div>
      <div slot="footer-start">
        <calcite-tooltip reference-element=${
          Station_Id + "_chip"
        }>Station accessibility: ${Accessability}</calcite-tooltip>
        <calcite-chip icon=${
          Accessability === "Private" ? "lock" : "unlock"
        } id=${Station_Id + "_chip"} label=${Accessability}></calcite-chip>
      </div>
      <div slot="footer-end">
        <calcite-chip scale="s" label=${Fuel_Type} id="electric">${Fuel_Type}</calcite-chip>
      </div>
    </calcite-card>`;

  const cardElement = document.createRange().createContextualFragment(card);
  container.appendChild(cardElement);
}
