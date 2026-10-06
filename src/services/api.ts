import type { VideoInfo, Track } from '../types';

const BASE_URL = 'https://vineetbisht.tail02b0f1.ts.net';

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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Downloads thumbnail image and converts it into a persistent Base64 string for 100% offline viewing
export const fetchImageAsBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
};

export const fetchVideoInfo = async (url: string): Promise<VideoInfo> => {
  const res = await fetch(`${BASE_URL}/converter/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Received non-JSON response from backend. Verify Tailscale connection and that NestJS is running.`
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

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s per attempt

    try {
      if (attempt > 1 && onProgress) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Retrying download (Attempt ${attempt}/${maxRetries})...`,
        });
      }

      const res = await fetch(`${BASE_URL}/converter/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Download endpoint returned ${res.status}: ${res.statusText}`);
      }

      // Extract custom metadata headers
      const rawTitle = res.headers.get('X-Audio-Title');
      const rawArtist = res.headers.get('X-Audio-Artist');
      const rawThumb = res.headers.get('X-Audio-Thumbnail');

      const title = previewFallback?.title || safeDecode(rawTitle) || 'Unknown Title';
      const artist = previewFallback?.channel || safeDecode(rawArtist) || 'Unknown Artist';
      const rawThumbnailUrl = previewFallback?.thumbnail || rawThumb || '';
      const duration = previewFallback?.duration || Number(res.headers.get('X-Audio-Duration')) || 0;
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
                // If stream does not provide Content-Length, prevent 0% hang by showing live MBs
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

        // Merge all chunks into a contiguous Uint8Array to prevent iOS WebKit audio playback bugs
        const completeBinary = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          completeBinary.set(chunk, offset);
          offset += chunk.length;
        }

        const mimeType = res.headers.get('content-type') || 'audio/mpeg';
        audioBlob = new Blob([completeBinary.buffer], { type: mimeType });
      }

      // Convert thumbnail to local Base64 for offline availability
      const offlineThumbnail = await fetchImageAsBase64(rawThumbnailUrl);

      return {
        id,
        title,
        artist,
        duration,
        durationFormatted: previewFallback?.durationFormatted || formatDuration(duration),
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