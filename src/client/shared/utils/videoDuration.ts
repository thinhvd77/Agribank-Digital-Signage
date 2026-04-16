/**
 * Extracts the duration (in seconds, rounded) of a video from a File or URL.
 * Uses HTML5 <video> metadata loading. Rejects on error or after timeout.
 */
export function extractVideoDuration(
  source: File | string,
  timeoutMs = 10000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const objectUrl = source instanceof File ? URL.createObjectURL(source) : null;
    const url = objectUrl ?? (source as string);

    let settled = false;
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Timeout extracting video duration'));
    }, timeoutMs);

    video.onloadedmetadata = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration < 1) {
        reject(new Error('Invalid video duration'));
        return;
      }
      resolve(Math.round(duration));
    };

    video.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    video.src = url;
  });
}
