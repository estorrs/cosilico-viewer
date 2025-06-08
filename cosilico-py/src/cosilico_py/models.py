from uuid import uuid4
from enum import Enum
from datetime import datetime, timezone

from ome_types import OME
from pydantic import BaseModel, Field, FilePath, AwareDatetime


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

class ExperimentUploadBundle(BaseModel):
    experiment: Experiment
    images: list[Image]
    layers: list[Layer]
    layer_metadata: list[LayerMetadata]