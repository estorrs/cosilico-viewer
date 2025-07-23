
import ImageLayer from 'ol/layer/Image.js';
import RasterSource from 'ol/source/Raster.js';
import { Projection } from 'ol/proj.js';
import OverviewMap from 'ol/control/OverviewMap.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import View from "ol/View.js";


import ZarrTileSource from './ZarrTileSource.js';
import { getClosestResolution } from './OpenlayersHelpers.js';
import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex } from './PixelTransforms.js';
import { generateColorMapping, defaultPalettes } from './ColorHelpers.js';
import { getOmeChannelNames } from './OmeHelpers.js';

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
    insertionIdx,
    viewSettings,
  ) {
    this.node = node;
    this.viewSettings = viewSettings;
    this.isBaseImage = isBaseImage;
    this.isVisible = this.viewSettings?.is_visible ?? false;
    if (this.isBaseImage && this.viewSettings == {}) {
      this.isVisible = true;
    }


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
    this.dtype = this.node.attrs.ome.images[0].pixels.type.value;
    // this.dtypeMax = this.dtype == 'uint8' ? 255 : 65025;
    this.dtypeMax = 255;
    this.dtypeMin = 0;
    this.overviewLayer = null;
    this.overviewControl = null;
    // this.overviewSources = [];
    this.isLoaded = false;
    this.insertionIdx = insertionIdx;

    this.currentRes = this.resolutions[0];
    this.closestRes = this.resolutions[0];
    this.currentZoom = this.resolutions[0] / this.tileSize;

    this.loadGenerationCounter = 0;

    this.projection = new Projection({
      code: 'PIXEL',
      units: 'pixels',
      extent: [0, 0, this.sizeX, this.sizeY],
    });

    this.channelNames = getOmeChannelNames(this.ome);
  }

  async init(map) {
    await this.populateInitialFields(map);
    return this;
  }

  static async create( node, imageId, isBaseImage, insertionIdx, viewSettings, map) {
    const instance = new Image(node, imageId, isBaseImage, insertionIdx, viewSettings);
    return await instance.init(map);
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
      layers: this.overviewLayer != null ? [this.overviewLayer] : [],
      view: new View({
        projection: this.projection,
        resolutions: [3 * this.resolutions[0] / this.tileSize],
        constrainOnlyCenter: true,
      }),
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

    if (sources.length == 0) {
      if (inPlace) {
        this.rasterLayer = new ImageLayer({
            source: null,
            visible: this.isVisible,
          });

          const layers = map.getLayers();
          layers.removeAt(this.insertionIdx);
          layers.insertAt(this.insertionIdx, this.rasterLayer);
      }
      

      return null;
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
        visible: this.isVisible,
      });

      const layers = map.getLayers();
      layers.removeAt(this.insertionIdx);
      layers.insertAt(this.insertionIdx, this.rasterLayer);
    } else {
      this.updateBeforeOperations(rasterSource)
      const rasterLayer = new ImageLayer({
        source: rasterSource,
        visible: this.isVisible,
      });
      return rasterLayer;
    }
  }

  updateResolutionInfo(map) {
    const current = map.getView().getResolution();
    this.currentRes = current * this.tileSize;
    this.closestRes = getClosestResolution(map, this.resolutions, this.tileSize);
    this.currentZoom = current;
  }

  updateInteractedChannel(channelName) {
    if (!this.imageView?.interactedChannelNames.includes(channelName)) {
			this.imageView?.interactedChannelNames.push(channelName);
		}
  }

  async addChannel(channelName, map) {
    if (this.imageView?.visibleChannelNames.includes(channelName)) {
      return null;
    }
    
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

    this.updateInteractedChannel(channelName);
  }

  async removeChannel(channelName, map) {

    const removalIndex = this.imageView.visibleChannelNames.indexOf(channelName);

    this.imageView.visibleChannelNames.splice(removalIndex, 1);
    this.imageView.zarrTileSources.splice(removalIndex, 1);

    this.updateRasterSource(map);

    if (this.isBaseImage) {
      await this.updateOverviewControl(map);
    }

    this.updateInteractedChannel(channelName);

  }

  setChannelColor(channelName, color) {
    let view = this.imageView.channelNameToView.get(channelName);
    view.color = color;
    this.channelToColor.set(channelName, color);

    this.updateInteractedChannel(channelName);
  }

  setVisibility(value) {
    this.rasterLayer.setVisible(value);
    this.overviewLayer.setVisible(value);
    this.isVisible = value;
  }

  async populateInitialFields(map) {

    this.channelToColor = generateColorMapping(defaultPalettes.imagePallete, this.channelNames); // this will eventually be populated by pulled info

    // this.viewSettings
    const channelViews = this.viewSettings.channel_views ?? {};

    const imageView = {
      channelNameToView: new Map(),
      opacity: this.viewSettings.opacity ?? 1.0,
      tIndex: this.viewSettings.t_index ?? 0,
      zIndex: this.viewSettings.z_index ?? 0,
      visibleChannelNames: this.viewSettings.visible_channels ?? [],
      zarrTileSources: [],
      interactedChannelNames: [], // tracks channel interactions to be saved later
    };
    this.imageView = imageView;

    for (const channelName of this.channelNames) {
      if (!(channelName in channelViews)) {
        const channelView = {
          minValue: this.dtypeMin,
          maxValue: this.dtypeMax,
          gamma: 1.,
          color: this.channelToColor.get(channelName)
        };

        this.imageView.channelNameToView.set(channelName, channelView);
      } else {
        const v = channelViews[channelName];
        const channelView = {
          minValue: v.min_value,
          maxValue: v.max_value,
          gamma: v.gamma,
          color: v.color
        };
        
        this.channelToColor.set(channelName, v.color);
        this.imageView.channelNameToView.set(channelName, channelView);
      }
    }

    // need to populate zarr tile sources here
    // let zarrSrcs = [];
    for (const channelName of this.imageView.visibleChannelNames) {
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
      this.imageView.zarrTileSources.push(newSource);

    }

    this.updateRasterSource(map);

    if (this.isBaseImage) {
      await this.updateOverviewControl(map);
    }

    this.isLoaded = true;
  }

}


