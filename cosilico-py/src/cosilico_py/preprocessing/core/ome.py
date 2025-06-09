from enum import Enum

def validate_ome(model):
    """Validate that OME has minimum required fields."""
    if not len(model.images):
        raise RuntimeError("OME metadata is missing fields. OME metadata does not contain any images. OME metadata must contain at least one image. OME.images must not be empty.")
    
    if model.images[0].pixels is None:
        raise RuntimeError("OME metadata is missing fields. OME metadata does not contain any pixel information. OME metadata must contain an entry for image.pixels.")
    
    for k in ['physical_size_x', 'physical_size_x_unit', 'size_x', 'size_y']:
        try:
            val = getattr( model.images[0].pixels, k)
            assert val is not None, f'Value for {k} must be not be None'
        except KeyError:
            raise RuntimeError(f'OME metadata is missing fields. {k} must be in image.pixels.')

def ome_serializer(obj):
    """Handles serialization of Enums and other non-standard JSON objects."""
    if isinstance(obj, Enum):  # Convert Enum to its value
        return obj.value
    if hasattr(obj, "__dict__"):  # Convert objects with attributes to dictionaries
        return obj.__dict__
    return str(obj)  # Convert anything else to a string
