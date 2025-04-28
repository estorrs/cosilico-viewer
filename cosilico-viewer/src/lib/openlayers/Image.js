// @ts-nocheck

import ImageLayer from 'ol/layer/Image';
import RasterSource from 'ol/source/Raster';
import { Projection } from 'ol/proj';
import OverviewMap from 'ol/control/OverviewMap.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import View from "ol/View";


import ZarrTileSource from './ZarrTileSource';
import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex } from './PixelTransforms.js';
import { generateColorMapping, defaultPalettes } from './ColorHelpers';
import { getOmeChannelNames } from './OmeHelpers';

const transformSourcePixels = function (pixels, data) {
  let values = [];
  for (let i = 0; i < pixels.length; i++) {
    values.push(pixels[i][0]);  // Get multi-band pixel array
  }
  const normValues = minMaxRangePixelTransform(values, data.minValues, data.maxValues);
  const pseudoPixel = applyPseudocolorToPixel(data.colors.slice(0, normValues.length), normValues);
  return [...pseudoPixel];
};

export class Image {
  constructor(
    node,
    imageId,
    isBaseImage,
  ) {
    this.node = node;
    this.isBaseImage = isBaseImage;
    this.isVisible = true;

    this.version = node.attrs.version;
    this.name = node.attrs.name;
    this.imageId = imageId;
    this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
    this.ome = this.node.attrs.ome;
    this.tileSize = this.node.attrs.tile_size;
    this.sizeY = this.node.attrs.ome.images[0].pixels.size_y;
    this.sizeX = this.node.attrs.ome.images[0].pixels.size_x;
    this.sizeC = this.node.attrs.ome.images[0].pixels.size_c;
    this.sizeT = this.node.attrs.ome.images[0].pixels.size_t;
    this.sizeZ = this.node.attrs.ome.images[0].pixels.size_z;
    this.upp = this.node.attrs.upp;
    this.unit = this.node.attrs.unit;
    this.dtypeMax = 255;
    this.dtypeMin = 0;
    this.overviewLayer = null;
    this.overviewControl = null;
    // this.overviewSources = [];
    this.isLoaded = false;

    this.loadGenerationCounter = 0;

    this.projection = new Projection({
      code: 'PIXEL',
      units: 'pixels',
      extent: [0, 0, this.sizeX, this.sizeY],
    });

    this.channelNames = getOmeChannelNames(this.ome);
    this.populateInitialFields();
  }

  async updateOverviewControl(map) {
    let sources = [];

    for (const source of this.imageView.zarrTileSources) {
      const cIndex = source.cIndex;
      const newSource = await ZarrTileSource.create({
        node: this.node,
        fullImageHeight: this.sizeY,
        fullImageWidth: this.sizeX,
        tileSize: this.tileSize,
        resolutions: this.resolutions,
        tIndex: this.imageView.tIndex,
        cIndex: cIndex,
        zIndex: this.imageView.zIndex
      });
      sources.push(newSource);
    }

    this.overviewLayer = this.updateRasterSource(null, sources, false);

    if (this.overviewControl != null) {
      map.removeControl(this.overviewControl);
    }

    this.overviewControl = new OverviewMap({
      collapsed: false,
      collapsible: false,
      layers: [this.overviewLayer],
    });

    map.addControl(this.overviewControl);

  }

  updateOverviewMapLayerOperations() {
    if (this.overviewLayer != null) {
      this.updateBeforeOperations(this.overviewLayer.getSource())
    }
  }

  updateBeforeOperations(rasterSource = null) {
    const imageView = this.imageView;
    if (rasterSource == null) {
      rasterSource = this.rasterSource;
    }
    if (imageView.visibleChannelNames.length > 0) {
      const colors = imageView.visibleChannelNames.map(name => this.channelToColor.get(name));
      const minValues = imageView.visibleChannelNames.map(name => this.imageView.channelNameToView.get(name).minValue);
      const maxValues = imageView.visibleChannelNames.map(name => this.imageView.channelNameToView.get(name).maxValue);

      rasterSource.on('beforeoperations', function (event) {
        event.data.minValues = [...minValues];
        event.data.maxValues = [...maxValues];
        event.data.colors = colors;
      });
      rasterSource.changed();
    }
  }

  updateRasterSource(map = null, sources = null, inPlace = true) {
    if (sources == null) {
      sources = [...this.imageView.zarrTileSources];
    }
    const rasterSource = new RasterSource({
      sources: sources,
      operation: transformSourcePixels,
      lib: {
        minMaxRangePixelTransform: minMaxRangePixelTransform,
        applyPseudocolorToPixel: applyPseudocolorToPixel,
      },
    });

    if (inPlace) {
      this.rasterSource = rasterSource;
      this.updateBeforeOperations();

      this.rasterLayer = new ImageLayer({
        source: this.rasterSource,
      });

      const layers = map.getLayers();
      layers.removeAt(0);
      layers.insertAt(0, this.rasterLayer);
    } else {
      this.updateBeforeOperations(rasterSource)
      const rasterLayer = new ImageLayer({
        source: rasterSource,
      });
      return rasterLayer;
    }
  }

  async addChannel(channelName, map) {
    const cIndex = this.channelNames.indexOf(channelName);
    const newSource = await ZarrTileSource.create({
      node: this.node,
      fullImageHeight: this.sizeY,
      fullImageWidth: this.sizeX,
      tileSize: this.tileSize,
      resolutions: this.resolutions,
      tIndex: this.imageView.tIndex,
      cIndex: cIndex,
      zIndex: this.imageView.zIndex
    });

    this.imageView.visibleChannelNames.push(channelName);
    this.imageView.zarrTileSources.push(newSource);

    this.updateRasterSource(map);

    if (this.isBaseImage) {
      await this.updateOverviewControl(map);
    }
  }

  async removeChannel(channelName, map) {

    const removalIndex = this.imageView.visibleChannelNames.indexOf(channelName);

    this.imageView.visibleChannelNames.splice(removalIndex, 1);
    this.imageView.zarrTileSources.splice(removalIndex, 1);

    this.updateRasterSource(map);

    if (this.isBaseImage) {
      await this.updateOverviewControl(map);
    }

  }

  setChannelColor(channelName, color) {
    let view = this.imageView.channelNameToView.get(channelName);
    view.color = color;
    this.channelToColor.set(channelName, color);
  }

  setVisibility(value) {
    this.rasterLayer.setVisible(value);
    this.overviewLayer.setVisible(value);
		this.isVisible = value;
  }

  populateInitialFields() {
    this.channelToColor = generateColorMapping(defaultPalettes.imagePallete, this.channelNames); // this will eventually be populated by pulled info

    const imageView = {
      channelNameToView: new globalThis.Map(),
      opacity: 1.0,
      tIndex: 0,
      zIndex: 0,
      visibleChannelNames: [],
      zarrTileSources: [],
    };
    this.imageView = imageView;

    for (let i = 0; i < this.channelNames.length; i++) {
      const channelName = this.channelNames[i];
      const channelView = {
        minValue: this.dtypeMin,
        maxValue: this.dtypeMax,
        gamma: 1.,
        color: this.channelToColor.get(channelName)
      };

      this.imageView.channelNameToView.set(channelName, channelView);
    }

    this.isLoaded = true;
  }

}


