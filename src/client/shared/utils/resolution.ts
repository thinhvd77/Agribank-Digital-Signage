const RESOLUTION_PATTERN = /^([1-9]\d{2,4})x([1-9]\d{2,4})$/i;

export interface ParsedResolution {
  width: number;
  height: number;
  aspectRatio: number;
  value: string;
}

export function isValidResolutionString(value: string): boolean {
  return RESOLUTION_PATTERN.test(value.trim());
}

export function parseResolution(value: string | null | undefined): ParsedResolution | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(RESOLUTION_PATTERN);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    return null;
  }

  return {
    width,
    height,
    aspectRatio: width / height,
    value: `${width}x${height}`,
  };
}
