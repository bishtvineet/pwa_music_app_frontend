export interface UpdateCheckResult {
  success: boolean;
  message: string;
}

export const checkForAppUpdate = async (): Promise<UpdateCheckResult> => {
  // Step 1: Check basic device connectivity
  if (!navigator.onLine) {
    return {
      success: false,
      message: 'You are offline. Connect to Wi-Fi/Internet to check for updates.',
    };
  }

  // Step 2: Health-check probe to verify the server is live and serving the app
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    // Request the root HTML with a timestamp to bypass any local caching proxy
    const probeResponse = await fetch(`/?_health=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!probeResponse.ok) {
      return {
        success: false,
        message: `Server returned error (${probeResponse.status}). Update aborted to preserve offline mode.`,
      };
    }

    // Verify it actually returned HTML rather than a broken proxy error
    const contentType = probeResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return {
        success: false,
        message: 'Invalid server response. Keeping current working version.',
      };
    }
  } catch (err: any) {
    console.warn('Server reachability probe failed:', err);
    return {
      success: false,
      message: 'Dev server unreachable. Please make sure your laptop is on and reachable.',
    };
  }

  // Step 3: Server is verified live - proceed to update Service Worker & caches safely
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    // Step 4: Clear stale UI asset caches (IndexedDB audio is untouched)
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    // Reload into the fresh verified version
    window.location.reload();
    return { success: true, message: 'Updated successfully!' };
  } catch (updateErr) {
    console.error('Cache clearance failed:', updateErr);
    return {
      success: false,
      message: 'Could not apply updates. Continuing on current version.',
    };
  }
};