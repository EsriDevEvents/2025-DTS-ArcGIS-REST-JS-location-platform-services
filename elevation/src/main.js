import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements as defineCalciteElements } from "@esri/calcite-components/dist/loader";
import { defineCustomElements as defineChartsElements } from "@arcgis/charts-components/dist/loader";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import esriConfig from "@arcgis/core/config.js";
import { ApiKeyManager } from "@esri/arcgis-rest-request";
import { findElevationAtManyPoints } from "@esri/arcgis-rest-elevation";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import { LineChartModel } from "@arcgis/charts-model";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

// load the calcite components
defineCalciteElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/3.0.3/assets",
});
defineChartsElements(window, {
  resourcesUrl: "https://js.arcgis.com/charts-components/4.32/assets",
});
// create a new authentication manager from the API key stored in the .env file
const authentication = ApiKeyManager.fromKey(apiKey);

esriConfig.apiKey = apiKey;

const points = [
  [174.7, -41.291],
  [174.72, -41.297], // Makara Peak Mountain Bike Park
  [174.733, -41.298],
  [174.757, -41.293],
  [174.769, -41.289],
  [174.769, -41.289], // Wellington, NZ
  [174.779, -41.282],
  [174.792, -41.282],
  [174.802, -41.279],
  [174.819, -41.275],
  [174.838, -41.273],
  [174.854, -41.269],
  [174.87, -41.263],
  [174.871, -41.257],
  [174.867, -41.255], // Somes Island
  [174.865, -41.2552],
  [174.8655, -41.257],
];

const arcgisMap = document.querySelector("arcgis-map");

let graphicsLayer, view;

arcgisMap.addEventListener("arcgisViewReadyChange", () => {
  view = event.target.view;

  view.popup.dockEnabled = true;
  view.popup.dockOptions = {
    position: "top-right",
    breakpoint: false,
  };

  graphicsLayer = new GraphicsLayer();
  arcgisMap.addLayer(graphicsLayer);

  getElevationData();
});

async function getElevationData() {
  const response = await findElevationAtManyPoints({
    coordinates: points,
    relativeTo: "meanSeaLevel",
    authentication,
  });

  const elevationValues = response.result.points.map((point) => point.z);

  const graphics = points.map(([longitude, latitude], index) => {
    const elevation = elevationValues[index];

    const point = {
      type: "point",
      longitude: longitude,
      latitude: latitude,
    };

    return new Graphic({
      geometry: point,
      attributes: {
        oid: index,
        elevation,
        latitude,
        longitude,
      },
    });
  });

  const featureLayer = new FeatureLayer({
    source: graphics,
    objectIdField: "OBJECTID",
    fields: [
      {
        name: "OBJECTID",
        type: "oid",
      },
      {
        name: "elevation",
        type: "double",
      },
      {
        name: "latitude",
        type: "double",
      },
      {
        name: "longitude",
        type: "double",
      },
    ],
    popupTemplate: {
      title: (event) => {
        return `Elevation relative to ${
          event.graphic.attributes.elevation === "meanSeaLevel"
            ? "mean sea level"
            : "ground level"
        }`;
      },
      content:
        "Latitude: {latitude}<br>Longitude: {longitude}<br>Elevation: {elevation} meters",
    },
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-marker",
        color: "black",
        size: "10px",
        outline: {
          color: "white",
          width: 1,
        },
      },
    },
  });
  arcgisMap.addLayer(featureLayer);

  const polylineGraphic = new Graphic({
    geometry: {
      type: "polyline",
      paths: points,
    },
    symbol: {
      type: "simple-line",
    },
  });

  view.whenLayerView(featureLayer).then(async (featureLayerView) => {
    initChart();
    graphicsLayer.add(polylineGraphic);
  });

  const lineChartElement = document.getElementById("elevation-profile");
  // create the bar chart model and set the x-axis field to month
  // this function is called when the slider value changes
  // to show the total hurricanes by month for the selected years
  // initialize the bar chart with bar chart model
  async function initChart() {
    const lineChartModel = new LineChartModel();
    await lineChartModel.setup({
      layer: featureLayer,
    });
    await lineChartModel.setXAxisField("elevation");

    lineChartModel.setTitleSymbol({
      type: "esriTS",
      font: {
        family: "Avenir Next",
        size: 15,
        weight: "bold",
      },
    });
    const config = lineChartModel.getConfig();
    lineChartModel.setYAxisTitleText("Elevation (m)");
    lineChartModel.setXAxisTitleVisibility(false);
    lineChartModel.setAreaVisible(true, 0);
    lineChartModel.setChartTitleVisibility(false);
    lineChartModel.setLegendVisibility(false);
    config.series[0].y = "elevation";
    config.series[0].x = "OBJECTID";
    config.series[0].query = {};
    config.axes[0].title.content.text = "Point";
    config.axes[1].visible = false;
    config.axes[1].labels.visible = false;
    config.axes[1].lineSymbol.color[3] = 0;
    config.axes[1].labels.content.color[3] = 0;
    config.series[0];
    config.series[0].dataLabels.visible = false;
    config.series[0].name = "Elevation";

    console.log({ config });
    lineChartElement.model = config;
    lineChartElement.layer = featureLayer;
    lineChartElement.view = view;
    lineChartElement.hideLoaderAnimation = true;
    lineChartElement.refresh();
  }
}
