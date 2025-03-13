import { ZipFileStore } from "@zarrita/storage";
import { HTTPRangeReader } from "@zarrita/storage/zip";
import { Group } from "@zarrita/core";
import RasterSource from 'ol/source/Raster';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';


import ZarrTileSource from './ZarrTileSource';
import ZarrVectorLoader from './ZarrVectorLoader';




////////////////
//// Image ////
///////////////


// OME
// Subset of OME-TIFF specification metadata

/**
 * @typedef {Object} OmeImage
 * @property {OmePixels} pixels - Pixel data of the image (Required)
 */

/**
 * @typedef {Object} OmePixels
 * @property {Channel[]} channels - List of channels (Required)
 * @property {number} size_x - Width of the image (Required)
 * @property {number} size_y - Height of the image (Required)
 * @property {number} size_c - Number of channels (Required)
 * @property {number} physical_size_x - Physical pixel size in x-dimension (Required)
 * @property {number} [size_z] - Depth of the image (Optional)
 * @property {number} [size_t] - Time points (Optional)
 */

/**
 * @typedef {Object} Channel
 * @property {string} name - Name of the channel (Required)
 */

/**
 * @typedef {Object} Ome
 * @property {OmeImage[]} images - List of images (Required)
 */



// ImageView
/**
 * @typedef {Object} ChannelView
 * @property {number} minValue
 * @property {number} maxValue
 * @property {number} gamma
 * @property {string} color
*/

/**
 * @typedef {Object} ImageView
 * @property {Map<string, ChannelView>} channelNameToView
 * @property {number} opacity
 * @property {number} tIndex
 * @property {number} zIndex
 * @property {number[]} visibleChannelNames
 * @property {ZarrTileSource[]} zarrTileSources
*/


/**
 * @typedef {Object} Image
 * @property {string} version
 * @property {string} imageId
 * @property {Group<ZipFileStore<HTTPRangeReader>>} node
 * @property {Ome} ome
 * @property {number[]} resolutions
 * @property {number} tileSize
 * @property {number} sizeY
 * @property {number} sizeX
 * @property {number} sizeC
 * @property {number} sizeT
 * @property {number} sizeZ
 * @property {number} upp
 * @property {string} unit
 * @property {string[]} channelNames
 * @property {Map<string, string>} channelToColor
 * @property {ImageView} imageView
 * @property {RasterSource} rasterSource
 * @property {ImageLayer} imageLayer
 */


////////////////
//// Vector ////
////////////////

/**
 * @typedef {Object} CategoricalFeatureView
 * @property {string} strokeWidth
 * @property {string} strokeColor
 * @property {string} fillColor
 * @property {string} shape // Only relavent for point features, // circle, triangle, easttriangle, westtriangle, southtriangle, square, diamond, cross, xcross, star
*/

/**
 * @typedef {Object} ContinuousFeatureView
 * @property {string} strokeWidth
 * @property {string} strokeColor
 * @property {string} shape // Only relavent for point features, // circle, triangle, easttriangle, westtriangle, southtriangle, square, diamond, cross, xcross, star
*/

/**
 * @typedef {Object} FeatureGroupView
 * @property {Map<string, CategoricalFeatureView>} featureNameToView
 * @property {number} fillOpacity
 * @property {number} strokeOpacity
 * @property {number[]} visibleFeatureNames
 * @property {number[]} visibleFeatureGroups
 * @property {number[]} visibleFeatureIndices
 * @property {ZarrVectorLoader[]} zarrVectorLoaders
*/

/**
 * @typedef {Object} CategoricalView
 * @property {Map<string, CategoricalFeatureView>} featureNameToView
 * @property {number} fillOpacity
 * @property {number} strokeOpacity
 * @property {number[]} visibleFeatureNames
 * @property {ZarrVectorLoader} zarrCategoricalLoader //remember to change
*/

/**
 * @typedef {Object} ContinuousView
 * @property {Map<string, ContinuousFeatureView>} featureNameToView
 * @property {number} fillOpacity
 * @property {number} strokeOpacity
 * @property {number} vMin
 * @property {number} vMax
 * @property {number} vCenter
 * @property {number} palette
 * @property {ZarrVectorLoader} zarContinuousLoader
*/

/**
 * @typedef {Object} FeatureGroupVector
 * @property {string} version
 * @property {string} vectorId
 * @property {string} vectorType // [point, polygon]
 * @property {Group<ZipFileStore<HTTPRangeReader>>} node
 * @property {number[]} resolutions
 * @property {number} tileSize
 * @property {string[]} featureNames
 * @property {string[]} featureGroups
 * @property {Map<number, number[]>} featureGroupsMap
 * @property {FeatureGroupView} vectorView
 * @property {VectorTileLayer} vectorTileLayer
 */

/**
 * @typedef {Object} CategoricalVector
 * @property {string} version
 * @property {string} vectorId
 * @property {string} vectorType // [point, polygon]
 * @property {Group<ZipFileStore<HTTPRangeReader>>} node
 * @property {number[]} resolutions
 * @property {number} tileSize
 * @property {string[]} featureNames
 * @property {CategoricalView} vectorView
 * @property {VectorTileLayer} vectorTileLayer
 */

/**
 * @typedef {Object} ContinuousVector
 * @property {string} version
 * @property {string} vectorId
 * @property {string} vectorType // [point, polygon]
 * @property {Group<ZipFileStore<HTTPRangeReader>>} node
 * @property {number[]} resolutions
 * @property {number} tileSize
 * @property {number} minValue
 * @property {number} maxValue
 * @property {ContinuousView} vectorView
 * @property {VectorTileLayer} vectorTileLayer
 */


export {};
