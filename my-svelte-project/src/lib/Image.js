import ImageLayer from 'ol/layer/Image';
import RasterSource from 'ol/source/Raster';
import { Projection } from 'ol/proj';


import ZarrTileSource from './ZarrTileSource';
import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex} from './PixelTransforms.js';
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
    ) {
        this.node = node;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.imageId = imageId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a), //remember to sort
        this.ome = this.node.attrs.ome,
        this.tileSize = this.node.attrs.tile_size,
        this.sizeY = this.node.attrs.ome.images[0].pixels.size_y,
        this.sizeX = this.node.attrs.ome.images[0].pixels.size_x,
        this.sizeC = this.node.attrs.ome.images[0].pixels.size_c,
        this.sizeT = this.node.attrs.ome.images[0].pixels.size_t,
        this.sizeZ = this.node.attrs.ome.images[0].pixels.size_z,
        this.upp = this.node.attrs.upp,
        this.unit = this.node.attrs.unit,
        this.isLoaded = false;

        this.projection = new Projection({
            code: 'PIXEL',
            units: 'pixels',
            extent: [0, 0, this.sizeX, this.sizeY],
        });

        this.channelNames = getOmeChannelNames(this.ome);
        this.populateInitialFields();
    }

    updateBeforeOperations() {
        const imageView = this.imageView;
        if (imageView.visibleChannelNames.length > 0) {
            const colors = imageView.visibleChannelNames.map(name => this.channelToColor.get(name));
            const minValues = imageView.visibleChannelNames.map(name => this.imageView.channelNameToView.get(name).minValue);
            const maxValues = imageView.visibleChannelNames.map(name => this.imageView.channelNameToView.get(name).maxValue);

            this.rasterSource.on('beforeoperations', function (event) {
                event.data.minValues = [...minValues];
                event.data.maxValues = [...maxValues];
                event.data.colors = colors;
            });
            this.rasterSource.changed();
        }
    }
    
    updateRasterSource(map) {
        this.rasterSource = new RasterSource({
            sources: [...this.imageView.zarrTileSources],
            operation: transformSourcePixels,
            lib: {
                minMaxRangePixelTransform: minMaxRangePixelTransform,
                applyPseudocolorToPixel: applyPseudocolorToPixel,
            },
        });
        this.updateBeforeOperations();

        this.rasterLayer = new ImageLayer({
            source: this.rasterSource,
        });

        map.addLayer(this.rasterLayer);
    }
    
    addChannel(channelName, map) {
      const cIndex = this.channelNames.indexOf(channelName);
      const newSource = new ZarrTileSource({
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
    }
    
    removeChannel(channelName, map) {
    
      const removalIndex = this.imageView.visibleChannelNames.indexOf(channelName);
    
      this.imageView.visibleChannelNames.splice(removalIndex, 1);
      this.imageView.zarrTileSources.splice(removalIndex, 1);
    
      this.updateRasterSource(map);
    
      // rasterLayer.setSource(rasterSource);
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
            minValue: 0,
            maxValue: 255,
            gamma: 1.,
            color: this.channelToColor.get(channelName)
          };
          
          this.imageView.channelNameToView.set(channelName, channelView);
        }
        
        this.isLoaded = true;
      }

}


