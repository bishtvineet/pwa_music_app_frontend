export interface UpdateCheckResult {
  success: boolean;
  message: string;
}

export const checkForAppUpdate = async (): Promise<UpdateCheckResult> => {
  // 1. Device network status check
  if (!navigator.onLine) {
    return {
      success: false,
      message: 'You are offline. Connect to Wi-Fi/Internet to check for updates.',
    };
  }

  // 2. Service Worker API support check
  if (!('serviceWorker' in navigator)) {
    return {
      success: false,
      message: 'Service Worker is not supported on this browser.',
    };
  }

  try {
    let registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return {
        success: false,
        message: 'No active service worker registered.',
      };
    }

    // Case A: A new update was already downloaded and is waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
      return {
        success: true,
        message: 'App updated to the newest version!',
      };
    }

    // 3. Ask the browser to check the host server for sw.js byte changes
    await registration.update();

    // Re-fetch the registration so TypeScript doesn't narrow registration.waiting to 'never'
    registration = await navigator.serviceWorker.getRegistration();

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
      return {
        success: true,
        message: 'App updated to the newest version!',
      };
    }

    if (registration?.installing) {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
      return {
        success: true,
        message: 'New update found! Installing in background...',
      };
    }

    return {
      success: true,
      message: 'Your app is already running the latest version!',
    };
  } catch (err: unknown) {
    console.warn('Service worker update check failed:', err);
    return {
      success: false,
      message: 'Dev server unreachable. Please verify your laptop is reachable.',
    };
  }
};