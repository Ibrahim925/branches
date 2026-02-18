export type ImageCrop = {
  zoom?: number | null;
  focusX?: number | null;
  focusY?: number | null;
};

type CropBounds = {
  minZoom?: number;
  maxZoom?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: number | null | undefined, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

export function resolveImageCrop(
  crop: ImageCrop | null | undefined,
  bounds: CropBounds = {}
) {
  const minZoom = bounds.minZoom ?? 1;
  const maxZoom = bounds.maxZoom ?? 3;

  const zoom = clamp(parseNumber(crop?.zoom, 1), minZoom, maxZoom);
  const focusX = clamp(parseNumber(crop?.focusX, 50), 0, 100);
  const focusY = clamp(parseNumber(crop?.focusY, 50), 0, 100);

  return { zoom, focusX, focusY };
}

export function buildImageCropStyle(
  crop: ImageCrop | null | undefined,
  bounds: CropBounds = {}
) {
  const resolved = resolveImageCrop(crop, bounds);

  return {
    objectPosition: `${resolved.focusX}% ${resolved.focusY}%`,
    transform: `scale(${resolved.zoom})`,
    transformOrigin: `${resolved.focusX}% ${resolved.focusY}%`,
  };
}
