export type NetworkMode =
  | 'cloud'
  | 'laptop-relay'
  | 'laptop-proxy'
  | 'laptop-direct';

const STORAGE_KEY = 'tunes_network_mode';

const RENDER_BASE_URL = (
  import.meta.env.VITE_API_RENDER_URL ||
  'https://pwa-music-app-backend.onrender.com'
).replace(/\/$/, '');

const LAPTOP_BASE_URL = (
  import.meta.env.VITE_API_LAPTOP_URL ||
  'https://vineetbisht.tail02b0f1.ts.net'
).replace(/\/$/, '');

export interface NetworkModeInfo {
  label: string;
  badge: string;
  description: string;
  isLaptopDirect: boolean;
}

export const NETWORK_MODES: Record<NetworkMode, NetworkModeInfo> = {
  cloud: {
    label: 'Cloud (Render Auto)',
    badge: 'Render + Proxies',
    description: 'Uses Webshare proxy pool on Render with auto-failover to laptop',
    isLaptopDirect: false,
  },
  'laptop-relay': {
    label: 'Cloud Relay (Tailscale)',
    badge: 'Render Relay',
    description: 'Render skips proxies and bridges the download stream from laptop',
    isLaptopDirect: false,
  },
  'laptop-direct': {
    label: 'Laptop Direct (0-Proxy)',
    badge: 'Tailscale Direct',
    description: 'Direct to laptop via Tailscale using home Wi-Fi (0 proxy cost)',
    isLaptopDirect: true,
  },
  'laptop-proxy': {
    label: 'Laptop Proxy Pool',
    badge: 'Tailscale + Proxy',
    description: 'Direct to laptop via Tailscale running with Webshare proxy pool',
    isLaptopDirect: true,
  },
};

export const getSavedNetworkMode = (): NetworkMode => {
  const saved = localStorage.getItem(STORAGE_KEY) as NetworkMode | null;
  if (saved && saved in NETWORK_MODES) {
    return saved;
  }
  return 'cloud';
};

export const setSavedNetworkMode = (mode: NetworkMode): void => {
  localStorage.setItem(STORAGE_KEY, mode);
};

export const getApiConfig = (): { baseUrl: string; networkMode: NetworkMode } => {
  const mode = getSavedNetworkMode();
  const isDirect = NETWORK_MODES[mode].isLaptopDirect;
  const baseUrl = isDirect ? LAPTOP_BASE_URL : RENDER_BASE_URL;

  return {
    baseUrl,
    networkMode: mode,
  };
};

export const getLaptopUrl = (): string => LAPTOP_BASE_URL;
export const getRenderUrl = (): string => RENDER_BASE_URL;