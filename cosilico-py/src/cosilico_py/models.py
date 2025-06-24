from uuid import uuid4
from enum import Enum
from datetime import datetime, timezone
from typing import Annotated, Dict, List, Literal, Union

from ome_types import OME
from pydantic import BaseModel, Field, FilePath, DirectoryPath, AwareDatetime
from typing import Dict, List, Literal

class RoleEnum(str, Enum):
    user = 'user'
    admin = 'admin'
    
class PlatformEnum(str, Enum):
    x10_xenium = '10X Xenium'
    x10_visium = '10X Visium'
    x10_visium_hd = '10X Visium HD'
    nanostring_geomx = 'NanoString GeoMx'
    curio_bioscience_slideseq = 'Curio Bioscience Slide-seq'
    nanostring_cosmx = 'NanoString CosMx'
    vizgen_merscope = 'Vizgen MERSCOPE'
    he = 'H&E'
    ihc = 'IHC'
    unknown = 'Unknown'

class PermissionEnum(str, Enum):
    none = ''
    r = 'r'
    rw = 'rw'
    rwd = 'rwd'

class MetadataTypeEnum(str, Enum):
    categorical = 'categorical'
    continuous = 'continuous'
    
class DirectoryEntityTypeEnum(str, Enum):
    experiment = 'experiment'
    directory = 'directory'
    
class Profile(BaseModel):
    id: str = None
    name: str
    role: RoleEnum

class DirectoryEntity(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    name: str
    parent_id: str | None = None
    entity_type: DirectoryEntityTypeEnum
    permission: PermissionEnum | None = None
    authenticated_users_read: list[str] = []
    authenticated_users_write: list[str] = []
    authenticated_users_delete: list[str] = []
    
    def assign_permission(self, p):
        if p is not None:
            return p
        
        if self.parent_id is None:
            return PermissionEnum.r
        
        return PermissionEnum.none
    
    def model_post_init(self, __context):
        object.__setattr__(
            self,
            'permission',
            self.assign_permission(self.permission)
        )


class Experiment(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    version: str = 'v0.0.1'
    experiment_date: AwareDatetime = datetime.now(timezone.utc)
    name: str
    platform: PlatformEnum = PlatformEnum.unknown
    platform_version: str = ''
    metadata: dict = {}
    parent_id: str | None = None
    image_ids: list[str] = []
    layer_ids: list[str] = []
    view_setting_id: str | None = None
    tags: list[str] = []

class Image(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    version: str = 'v0.0.1'
    experiment_id: str
    name: str
    metadata: OME = OME()
    tags: list[str] = []
    local_path: FilePath | None = None
    path: str = ''
        
    def model_post_init(self, __context):
        object.__setattr__(self, 'path', f'{self.id}.zarr.zip')

class Layer(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    version: str = 'v0.0.1'
    experiment_id: str
    name: str
    is_grouped: bool
    metadata: dict = {}
    tags: list[str] = []
    local_path: FilePath | None = None
    path: str = ''

    def model_post_init(self, __context):
        object.__setattr__(self, 'path', f'{self.id}.zarr.zip')

class LayerMetadata(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    version: str = 'v0.0.1'
    layer_id: str
    name: str
    metadata_type: MetadataTypeEnum
    is_sparse: bool
    fields: list[str]
    metadata: dict = {}
    tags: list[str] = [] 
    local_path: FilePath | None = None
    path: str = ''

    def model_post_init(self, __context):
        object.__setattr__(self, 'path', f'{self.id}.zarr.zip')


class ImageChannelView(BaseModel):
    min_value: Annotated[float, Field(ge=0, description="Lower display intensity bound")] = None
    max_value: Annotated[float, Field(ge=0, description="Upper display intensity bound")] = None
    gamma: Annotated[float, Field(gt=0, description="Gamma-correction factor applied in shader")] = 1.
    color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="24-bit sRGB colour used for pseudocolour composite")] = None

class ImageView(BaseModel):
    opacity: Annotated[float, Field(ge=0.0, le=1.0, description="Image opacity.")] = 1.0
    t_index: Annotated[int, Field(ge=0, description="Timepoint (T) index to view.")] = 0
    z_index: Annotated[int, Field(ge=0, description="Depth (Z) index to view.")] = 0
    visible_channels: Annotated[List[str], Field(description="Order-preserving list of channel names currently shown")] = []
    channel_views: Annotated[Dict[str, ImageChannelView], Field(description="Map channel name ➜ rendering parameters")] = {}


class ShapeEnum(str, Enum):
    circle = 'circle'
    triangle = 'triangle'
    square = 'square'
    diamond = 'diamond'
    hexagon = 'hexagon'
    star = 'star'
    sparkle = 'sparkle'

class BorderTypeEnum(str, Enum):
    default = 'default'
    field = 'field'

class FeatureStyle(BaseModel):
    """Visual style for a single feature (point / polygon)."""
    shape_type: ShapeEnum = "circle"
    fill_color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="Fill color. Must be hex.")] = None
    stroke_color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="Stroke color. Must be hex.")] = "#dddddd"
    stroke_width: Annotated[float, Field(ge=0.01)] = 1.0
    scale: Annotated[float, Field(ge=0)] = 1.0

class GroupedVectorView(BaseModel):
    kind: Literal["grouped"] = "grouped"

    # global toggles
    scale: Annotated[float, Field(ge=0)] = 1.0
    fill_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="Stroke color. Must be hex.")] = "#dddddd"
    stroke_width: Annotated[float, Field(ge=0.01)] = 1.0

    # visibility
    visible_feature_names: List[str] = []

    # per-feature style map  ➜  derived from `featureNameToView`
    feature_styles: Dict[str, FeatureStyle]


# ---------------------------------------------------------------------
#  CATEGORICAL VIEW  (FeatureVector, metadata type == categorical)
# ---------------------------------------------------------------------
class CategoricalVectorView(BaseModel):
    kind: Literal["categorical"] = "categorical"

    fill_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="Stroke color. Must be hex.")] = "#dddddd"
    stroke_width: Annotated[float, Field(ge=0.01)] = 1.0
    stroke_darkness: Annotated[float, Field(ge=0.0, le=1.0)] = 0.5
    border_type: BorderTypeEnum = "default"
    scale: Annotated[float, Field(ge=0)] = 1.0

    # visibility
    visible_fields: List[str] = []

    # per-category style map  ➜  `fieldToView`
    field_styles: Dict[str, FeatureStyle]


# ---------------------------------------------------------------------
#  CONTINUOUS VIEW  (FeatureVector, metadata type == continuous)
# ---------------------------------------------------------------------
class ContinuousFieldValueInfo(BaseModel):
    v_min: float
    v_max: float
    v_center: float = None   # diverging palettes
    v_step_size: float = 0.01

class ContinuousVectorView(BaseModel):
    kind: Literal["continuous"] = "continuous"

    fill_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_opacity: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0
    stroke_color: Annotated[str, Field(pattern=r"^#?[0-9A-Fa-f]{6}$", description="Stroke color. Must be hex.")] = "#dddddd"
    stroke_width: Annotated[float, Field(ge=0.01)] = 1.0
    stroke_darkness: Annotated[float, Field(ge=0.0, le=1.0)] = 0.5
    border_type: BorderTypeEnum = "default"
    scale: Annotated[float, Field(ge=0)] = 1.0

    palette: str = "viridis"

    # exactly one field can be displayed at a time
    visible_field: str = None

    # numeric range info per field index
    field_value_info: Dict[int, ContinuousFieldValueInfo]

    # single style template for points (polygons inherit stroke/fill directly)
    feature_style: FeatureStyle

class ExperimentViewSetting(BaseModel):
    """
    Experiment-level view setting.
    """
    id: str = Field(default_factory=lambda: uuid4().hex)
    version: str = 'v0.0.1'
    experiment_id: Annotated[str, Field(description='Experiment the view is attached to.')]
    name: Annotated[str, Field(description='Name for view setting.')]
    image_views: Annotated[Dict[str, ImageView], Field(description='Maps image id to image view.')] = {}
    layer_views: Annotated[Dict[str, Union[GroupedVectorView, CategoricalVectorView, ContinuousVectorView]], Field(description='Maps layer id to layer view.')] = {}
    layer_metadata_views: Annotated[Dict[str, Union[GroupedVectorView, CategoricalVectorView, ContinuousVectorView]], Field(description='Maps layer metadata id to layer view.')] = {}

class ExperimentUploadBundle(BaseModel):
    experiment: Experiment
    images: list[Image]
    layers: list[Layer]
    layer_metadata: list[LayerMetadata]

class ExperimentInput(BaseModel):
    name: Annotated[str, Field(description='Name of the experiment. If not provided will attempt to populate from input files.')] = None
    bbox: Annotated[list[Annotated[int, Field(gt=0)]], Field(min_length=4, max_length=4, description='Bounding box to use to crop the experiment. By default none is applied. Should be [top, bottom, right, left].')] | None = None
    verbose: Annotated[bool, Field(description='Whether to log verbose output to the console. Default is True.')] = True

class X10XeniumInput(ExperimentInput):
    platform: Annotated[PlatformEnum, Field(description='Experimental platform.')] = PlatformEnum.x10_xenium
    cellranger_outs: Annotated[DirectoryPath, Field(description='CellRanger output directory for the Xenium run.')]
    to_uint8: Annotated[bool, Field(description='Whether to convert image to UINT8. Can save space compared to UINT16 images')] = False