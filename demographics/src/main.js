import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { queryDemographicData } from "@esri/arcgis-rest-demographics";

// load the calcite components
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.5.1/assets",
});

// Create a new authentication from API key stored in the .env file
const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
const authentication = ApiKeyManager.fromKey(apiKey);

const basemapEnum = "ArcGIS:ColoredPencil";

const map = new maplibregl.Map({
  container: "map",
  style: `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/${basemapEnum}?type=style&token=${apiKey}`,
  zoom: 13,
  center: [-122.676483, 45.523064],
});

map.getCanvas().style.cursor = "crosshair";

map.on("click", async (event) => {
  const response = await queryDemographicData({
    // The request defaults to a one mile radius around the clicked location. Learn more about the different study area options at https://developers.arcgis.com/documentation/mapping-and-location-services/data-enrichment/how-to-build-a-data-enrichment-app/#types-of-study-areas
    studyAreas: [
      {
        geometry: {
          // event.lngLat represents the clicked location on the map
          x: event.lngLat.lng,
          y: event.lngLat.lat,
        },
      },
    ],
    analysisVariables: [
      // analysis variables can be explored at https://developers.arcgis.com/documentation/mapping-and-location-services/data-enrichment/tools/analysis-variable-finder/
      "TLIFENAME", //
      "AtRisk.TOTHH_CY", // total number of households
      "AtRisk.AVGHHSZ_CY", // average household size
      "PetsPetProducts.MP26007H_B", // owns 1 dog
      "PetsPetProducts.MP26008H_B", // owns 2+ dogs
    ],
    authentication,
  });

  console.log(response.results);
  
  let popupContent;
  const featureSet = response.results[0].value.FeatureSet;

  if (featureSet.length > 0 && featureSet[0].features.length > 0) {
    const { TLIFENAME, TOTHH_CY, AVGHHSZ_CY, MP26007h_B, MP26008h_B } =
      featureSet[0].features[0].attributes;

    popupContent = `
      <div>
        <h4>Data for a 1 mile search radius</h4>
        <p>Tapestry group name: ${TLIFENAME}</p>
        <p>Total number of households: ${TOTHH_CY}</p>
        <p>Average size of household: ${AVGHHSZ_CY} members</p>
        <p>Households owning 1 dog 🐶: ${MP26007h_B}</p>
        <p>Households owning 2 or more dogs 🐶🐶 : ${MP26008h_B}</p>
      </div>
    `;
  } else {
    popupContent = "<div>Data not available for this location.</div>";
  }

  const popup = new maplibregl.Popup()
    .setHTML(popupContent)
    .setLngLat(event.lngLat)
    .addTo(map);
});
