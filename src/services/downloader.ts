export interface DownloadProgress {
  percent: number; // 0 to 100 (or -1 if indeterminate)
  receivedBytes: number;
  totalBytes: number;
  statusText: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const downloadAudioWithRetry = async (
  downloadUrl: string,
  onProgress: (progress: DownloadProgress) => void,
  maxRetries = 3,
  retryDelayMs = 2000
): Promise<Blob> => {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s hard limit per attempt

    try {
      if (attempt > 1) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Retrying download (Attempt ${attempt}/${maxRetries})...`,
        });
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        // Fallback for browsers/proxies not providing readable body streams
        const blob = await response.blob();
        clearTimeout(timeoutId);
        return blob;
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            const percent = Math.min(Math.round((receivedBytes / totalBytes) * 100), 100);
            onProgress({
              percent,
              receivedBytes,
              totalBytes,
              statusText: `Downloading: ${percent}% (${(receivedBytes / (1024 * 1024)).toFixed(1)}MB / ${(totalBytes / (1024 * 1024)).toFixed(1)}MB)`,
            });
          } else {
            // Content-Length was not provided by stream
            onProgress({
              percent: -1,
              receivedBytes,
              totalBytes: 0,
              statusText: `Streaming audio: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB received...`,
            });
          }
        }
      }

      clearTimeout(timeoutId);

      const mimeType = response.headers.get('content-type') || 'audio/mpeg';
      return new Blob(chunks, { type: mimeType });
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`Download attempt ${attempt} failed:`, err);

      if (attempt >= maxRetries) {
        throw new Error(
          err.name === 'AbortError'
            ? 'Download timed out after 3 attempts. Please check server connection.'
            : `Download failed after ${maxRetries} attempts: ${err.message || 'Network error'}`
        );
      }

      // Wait 2 seconds before the next retry attempt
      onProgress({
        percent: 0,
        receivedBytes: 0,
        totalBytes: 0,
        statusText: `Connection failed. Waiting ${retryDelayMs / 1000}s to retry...`,
      });
      await sleep(retryDelayMs);
    }
  }

  throw new Error('Unexpected download termination');
};