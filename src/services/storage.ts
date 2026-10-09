import { entries, del } from 'idb-keyval';
import type { Track } from '../types';

const DB_NAME = 'music_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const LEGACY_PREFIX = 'track:';

export interface StoredTrackEntity {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationFormatted: string;
  audioBlob: Blob;
  thumbnailBlob?: Blob;
  thumbnailUrl?: string;
  downloadedAt: number;
  createdAt?: number;
}

export interface CleanupResult {
  freedBytes: number;
  freedFormatted: string;
  prunedCount: number;
}

// Open or initialize IndexedDB native instance
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Converts Base64 Data URL to Blob (for thumbnail storage)
export const dataUrlToBlob = (dataUrl: string): Blob | undefined => {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return undefined;
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return undefined;
  }
};

// Convert Blob to Base64 (for UI rendering fallback)
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
};

// Save a track to music_app_db (tracks store)
export const saveTrack = async (track: Track): Promise<void> => {
  const db = await openDB();

  const audioBlob = track.audioBlob || track.blob;
  let thumbnailBlob = track.thumbnailBlob;

  if (!thumbnailBlob && track.thumbnailUrl?.startsWith('data:')) {
    thumbnailBlob = dataUrlToBlob(track.thumbnailUrl);
  }

  const record: StoredTrackEntity = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    durationFormatted: track.durationFormatted,
    audioBlob,
    thumbnailBlob,
    thumbnailUrl: track.thumbnailUrl,
    downloadedAt: track.downloadedAt || track.createdAt || Date.now(),
    createdAt: track.createdAt || Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Retrieve a single track by ID
export const getTrack = async (id: string): Promise<Track | undefined> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = async () => {
      const record = req.result as StoredTrackEntity | undefined;
      if (!record || !record.audioBlob || record.audioBlob.size === 0) {
        resolve(undefined);
        return;
      }

      let thumbnailUrl = record.thumbnailUrl || '';
      if (!thumbnailUrl && record.thumbnailBlob) {
        thumbnailUrl = await blobToDataUrl(record.thumbnailBlob);
      }

      resolve({
        id: record.id,
        title: record.title,
        artist: record.artist,
        duration: record.duration,
        durationFormatted: record.durationFormatted,
        thumbnailUrl,
        blob: record.audioBlob,
        audioBlob: record.audioBlob,
        thumbnailBlob: record.thumbnailBlob,
        createdAt: record.createdAt || record.downloadedAt,
        downloadedAt: record.downloadedAt,
      });
    };

    req.onerror = () => reject(req.error);
  });
};

// Delete a track from IndexedDB
export const deleteTrack = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Retrieve all tracks with automatic migration from older idb-keyval stores
export const getAllTracks = async (): Promise<Track[]> => {
  const db = await openDB();

  // 1. Fetch records from music_app_db
  const primaryTracks: Track[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = async () => {
      const records = (req.result as StoredTrackEntity[]) || [];
      const loaded: Track[] = [];

      for (const rec of records) {
        if (!rec.audioBlob || rec.audioBlob.size === 0) continue;

        let thumb = rec.thumbnailUrl || '';
        if (!thumb && rec.thumbnailBlob) {
          thumb = await blobToDataUrl(rec.thumbnailBlob);
        }

        loaded.push({
          id: rec.id,
          title: rec.title,
          artist: rec.artist,
          duration: rec.duration,
          durationFormatted: rec.durationFormatted,
          thumbnailUrl: thumb,
          blob: rec.audioBlob,
          audioBlob: rec.audioBlob,
          thumbnailBlob: rec.thumbnailBlob,
          createdAt: rec.createdAt || rec.downloadedAt,
          downloadedAt: rec.downloadedAt,
        });
      }
      resolve(loaded);
    };

    req.onerror = () => reject(req.error);
  });

  // 2. Background check: Migrate any legacy records from idb-keyval
  (async () => {
    try {
      const legacyEntries = await entries<string, any>();
      for (const [key, value] of legacyEntries) {
        if (!String(key).startsWith(LEGACY_PREFIX)) continue;
        if (!value || typeof value !== 'object') continue;

        const alreadyExists = primaryTracks.some((t) => t.id === value.id);
        if (!alreadyExists && value.id) {
          let audioBlob: Blob | null = null;
          if (value.audioBuffer) {
            audioBlob = new Blob([value.audioBuffer as BlobPart], {
              type: value.mimeType || 'audio/mpeg',
            });
          } else if (value.blob instanceof Blob) {
            audioBlob = value.blob;
          }

          if (audioBlob && audioBlob.size > 0) {
            const thumbBlob = dataUrlToBlob(value.thumbnailUrl);
            await saveTrack({
              id: value.id,
              title: value.title || 'Unknown Title',
              artist: value.artist || 'Unknown Artist',
              duration: value.duration || 0,
              durationFormatted: value.durationFormatted || '0:00',
              thumbnailUrl: value.thumbnailUrl || '',
              blob: audioBlob,
              audioBlob,
              thumbnailBlob: thumbBlob,
              createdAt: value.createdAt || Date.now(),
              downloadedAt: value.createdAt || Date.now(),
            });
            console.log(`Migrated legacy track "${value.title}" to music_app_db.`);
          }
        }
        // Remove legacy key after importing
        await del(key);
      }
    } catch {
      // Ignore background migration failures
    }
  })();

  return primaryTracks.sort((a, b) => b.createdAt - a.createdAt);
};

export const getStorageStats = async (): Promise<{ totalBytes: number; formattedSize: string }> => {
  const tracks = await getAllTracks();
  const totalBytes = tracks.reduce((sum, item) => sum + (item.blob?.size || 0), 0);
  const formattedSize = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
  return { totalBytes, formattedSize };
};

export const ensurePersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
};

// Storage cleanup and pruning
export const pruneStaleStorage = async (): Promise<CleanupResult> => {
  let freedBytes = 0;
  let prunedCount = 0;
  const validTrackIds = new Set<string>();

  try {
    const db = await openDB();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const rec = cursor.value as StoredTrackEntity;
          const size = rec.audioBlob?.size || 0;

          if (!rec.id || !rec.audioBlob || size === 0) {
            freedBytes += size;
            cursor.delete();
            prunedCount++;
          } else {
            validTrackIds.add(rec.id);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });

    // Sync favorites in localStorage
    try {
      const savedFavorites = localStorage.getItem('tunes_favorites');
      if (savedFavorites) {
        const parsedFavorites: string[] = JSON.parse(savedFavorites);
        const filtered = parsedFavorites.filter((id) => validTrackIds.has(id));
        if (filtered.length !== parsedFavorites.length) {
          localStorage.setItem('tunes_favorites', JSON.stringify(filtered));
        }
      }
    } catch {
      // Ignore
    }
  } catch (err) {
    console.error('Prune storage error:', err);
  }

  const freedFormatted = (freedBytes / (1024 * 1024)).toFixed(2) + ' MB';
  return { freedBytes, freedFormatted, prunedCount };
};