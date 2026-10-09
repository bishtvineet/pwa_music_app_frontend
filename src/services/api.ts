import type { VideoInfo, Track } from '../types';
import { getApiConfig, getRenderUrl } from './network';

export interface ProgressCallbackData {
  percent: number; // 0 to 100, or -1 when indeterminate
  receivedBytes: number;
  totalBytes: number;
  statusText: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Safely decode URI-encoded headers returned by NestJS
const safeDecode = (str: string | null): string => {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Accurately extracts duration in seconds from an audio Blob using the browser decoder
export const getAudioDurationFromBlob = (blob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(blob);
      audio.src = objectUrl;

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        const dur = Math.round(audio.duration);
        resolve(!isNaN(dur) && isFinite(dur) ? dur : 0);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      };
    } catch {
      resolve(0);
    }
  });
};

// Downloads thumbnail image and converts it into a persistent Base64 string for 100% offline viewing
export const fetchImageAsBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;

  const { baseUrl } = getApiConfig();

  try {
    // Route image download through backend proxy to bypass CDN CORS
    const proxyUrl = `${baseUrl}/converter/thumbnail?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);

    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('[PWA] Failed to proxy thumbnail, falling back to URL:', err);
  }

  return url;
};

export const checkHealth = async (customBaseUrl?: string): Promise<boolean> => {
  const { baseUrl } = getApiConfig();
  const targetUrl = customBaseUrl || baseUrl;

  try {
    const res = await fetch(`${targetUrl}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
};

export const fetchVideoInfo = async (url: string): Promise<VideoInfo> => {
  const { baseUrl, networkMode } = getApiConfig();

  const res = await fetch(`${baseUrl}/converter/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, networkMode }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Received non-JSON response from backend. Check backend status at ${baseUrl}`
    );
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Failed to fetch preview: ${res.statusText}`);
  }

  return await res.json();
};

export const downloadAudioStream = async (
  url: string,
  previewFallback?: VideoInfo | null,
  onProgress?: (progress: ProgressCallbackData) => void,
  maxRetries = 3,
  retryDelayMs = 2000
): Promise<Track> => {
  let attempt = 0;
  const { baseUrl, networkMode } = getApiConfig();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

    try {
      if (attempt > 1 && onProgress) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Retrying download (Attempt ${attempt}/${maxRetries})...`,
        });
      }

      const res = await fetch(`${baseUrl}/converter/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          networkMode,
          id: previewFallback?.id,
          title: previewFallback?.title,
          channel: previewFallback?.channel,
          thumbnail: previewFallback?.thumbnail,
          duration: previewFallback?.duration,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Download endpoint returned ${res.status}: ${res.statusText}`);
      }

      // Extract metadata headers
      const rawTitle = res.headers.get('X-Audio-Title');
      const rawArtist = res.headers.get('X-Audio-Artist');
      const rawThumb = res.headers.get('X-Audio-Thumbnail');

      const title = previewFallback?.title || safeDecode(rawTitle) || 'Unknown Title';
      const artist = previewFallback?.channel || safeDecode(rawArtist) || 'Unknown Artist';
      const rawThumbnailUrl = previewFallback?.thumbnail || rawThumb || '';
      let duration = previewFallback?.duration || Number(res.headers.get('X-Audio-Duration')) || 0;
      const id = previewFallback?.id || res.headers.get('X-Audio-Id') || `track_${Date.now()}`;

      const contentLengthHeader = res.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const reader = res.body?.getReader();

      let audioBlob: Blob;

      if (!reader) {
        audioBlob = await res.blob();
      } else {
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            chunks.push(value);
            receivedBytes += value.length;

            if (onProgress) {
              if (totalBytes > 0) {
                const percent = Math.min(Math.round((receivedBytes / totalBytes) * 100), 100);
                onProgress({
                  percent,
                  receivedBytes,
                  totalBytes,
                  statusText: `Downloading: ${percent}% (${(receivedBytes / (1024 * 1024)).toFixed(1)}MB / ${(totalBytes / (1024 * 1024)).toFixed(1)}MB)`,
                });
              } else {
                onProgress({
                  percent: -1,
                  receivedBytes,
                  totalBytes: 0,
                  statusText: `Streaming audio: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB received...`,
                });
              }
            }
          }
        }

        clearTimeout(timeoutId);

        // Merge chunks into a contiguous Uint8Array to prevent iOS WebKit playback issues
        const completeBinary = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          completeBinary.set(chunk, offset);
          offset += chunk.length;
        }

        const mimeType = res.headers.get('content-type') || 'audio/mpeg';
        audioBlob = new Blob([completeBinary.buffer], { type: mimeType });
      }

      // If duration was 0 or missing from oEmbed fallback, decode from the blob directly
      if (!duration || duration <= 0) {
        duration = await getAudioDurationFromBlob(audioBlob);
      }

      // Convert thumbnail to Base64 for offline storage
      const offlineThumbnail = await fetchImageAsBase64(rawThumbnailUrl);

      return {
        id,
        title,
        artist,
        duration,
        durationFormatted: formatDuration(duration),
        thumbnailUrl: offlineThumbnail,
        blob: audioBlob,
        createdAt: Date.now(),
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.warn(`Download attempt ${attempt} failed:`, err);

      if (attempt >= maxRetries) {
        const msg = err instanceof Error ? err.message : 'Network error';
        throw new Error(`Download failed after ${maxRetries} attempts: ${msg}`);
      }

      if (onProgress) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Connection dropped. Retrying in ${retryDelayMs / 1000}s...`,
        });
      }

      await sleep(retryDelayMs);
    }
  }

  throw new Error('Download terminated unexpectedly');
};

export const syncCookiesToBackend = async (
  input: string | File,
): Promise<{ success: boolean; message: string; byteCount: number }> => {
  const cookieText = typeof input === 'string' ? input : await input.text();
  const { baseUrl } = getApiConfig();

  const res = await fetch(`${baseUrl}/converter/cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies: cookieText }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to update cookies on server.');
  }

  return await res.json();
};

export const pingRenderHealth = async (): Promise<{ ok: boolean; timeMs: number }> => {
  const renderUrl = getRenderUrl();
  const startTime = performance.now();

  try {
    const res = await fetch(`${renderUrl}/health`, { method: 'GET' });
    const timeMs = Math.round(performance.now() - startTime);
    if (!res.ok) return { ok: false, timeMs };
    const data = await res.json();
    return { ok: data?.status === 'ok', timeMs };
  } catch {
    const timeMs = Math.round(performance.now() - startTime);
    return { ok: false, timeMs };
  }
};