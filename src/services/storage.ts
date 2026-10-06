import { get, set, del, entries } from 'idb-keyval';
import type { Track } from '../types';

const TRACK_PREFIX = 'track:';

export interface StoredTrackRecord {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  createdAt: number;
  mimeType?: string;
  audioBuffer?: ArrayBuffer | Uint8Array;
  blob?: Blob; // Support legacy format from initial downloads
}

export interface CleanupResult {
  freedBytes: number;
  freedFormatted: string;
  prunedCount: number;
}

// Convert Track (with Blob) to StoredTrackRecord (with Uint8Array) before writing
export const saveTrack = async (track: Track): Promise<void> => {
  const buffer = await track.blob.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  const record: StoredTrackRecord = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    durationFormatted: track.durationFormatted,
    thumbnailUrl: track.thumbnailUrl,
    audioBuffer: uint8Array,
    mimeType: track.blob.type || 'audio/mpeg',
    createdAt: track.createdAt,
  };

  await set(`${TRACK_PREFIX}${track.id}`, record);
};

// Rebuild Blob from stored binary buffer or legacy blob
export const getTrack = async (id: string): Promise<Track | undefined> => {
  const record = await get<StoredTrackRecord>(`${TRACK_PREFIX}${id}`);
  if (!record) return undefined;

  let restoredBlob: Blob | null = null;

  if (record.audioBuffer) {
    restoredBlob = new Blob([record.audioBuffer as BlobPart], {
      type: record.mimeType || 'audio/mpeg',
    });
  } else if (record.blob && record.blob.size > 0) {
    restoredBlob = record.blob;
  }

  if (!restoredBlob || restoredBlob.size === 0) return undefined;

  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    duration: record.duration,
    durationFormatted: record.durationFormatted,
    thumbnailUrl: record.thumbnailUrl,
    blob: restoredBlob,
    createdAt: record.createdAt,
  };
};

export const deleteTrack = async (id: string): Promise<void> => {
  await del(`${TRACK_PREFIX}${id}`);
};

// Retrieve all tracks, migrate legacy records in background, and build fresh Blobs
export const getAllTracks = async (): Promise<Track[]> => {
  const allEntries = await entries<string, StoredTrackRecord>();
  const tracks: Track[] = [];

  for (const [key, record] of allEntries) {
    if (!String(key).startsWith(TRACK_PREFIX)) continue;

    let restoredBlob: Blob | null = null;

    // 1. New binary format
    if (record.audioBuffer) {
      restoredBlob = new Blob([record.audioBuffer as BlobPart], {
        type: record.mimeType || 'audio/mpeg',
      });
    }
    // 2. Legacy format (re-use blob and auto-migrate to Uint8Array)
    else if (record.blob && record.blob.size > 0) {
      restoredBlob = record.blob;

      (async () => {
        try {
          const buf = await record.blob!.arrayBuffer();
          const migrated: StoredTrackRecord = {
            id: record.id,
            title: record.title,
            artist: record.artist,
            duration: record.duration,
            durationFormatted: record.durationFormatted,
            thumbnailUrl: record.thumbnailUrl,
            audioBuffer: new Uint8Array(buf),
            mimeType: record.blob!.type || 'audio/mpeg',
            createdAt: record.createdAt,
          };
          await set(key, migrated);
          console.log(`Auto-migrated "${record.title}" to persistent binary format.`);
        } catch (e) {
          console.warn('Auto-migration failed for track', record.id, e);
        }
      })();
    }

    // Only return tracks that have valid, playable data
    if (restoredBlob && restoredBlob.size > 0) {
      tracks.push({
        id: record.id,
        title: record.title,
        artist: record.artist,
        duration: record.duration,
        durationFormatted: record.durationFormatted,
        thumbnailUrl: record.thumbnailUrl,
        blob: restoredBlob,
        createdAt: record.createdAt,
      });
    }
  }

  return tracks.sort((a, b) => b.createdAt - a.createdAt);
};

export const getStorageStats = async (): Promise<{ totalBytes: number; formattedSize: string }> => {
  const tracks = await getAllTracks();
  const totalBytes = tracks.reduce((sum, item) => sum + (item.blob?.size || 0), 0);
  const formattedSize = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
  return { totalBytes, formattedSize };
};

export const ensurePersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage granted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
};

/**
 * Selective Garbage Collection:
 * 1. Scans IndexedDB and deletes entries with empty/corrupted/zero-byte buffers.
 * 2. Deletes ghost keys that don't match the track structure.
 * 3. Removes orphaned IDs from localStorage favorites whose tracks no longer exist.
 * 4. NEVER touches CacheStorage (preserving offline PWA HTML/CSS/JS) or active playable songs.
 */
export const pruneStaleStorage = async (): Promise<CleanupResult> => {
  let freedBytes = 0;
  let prunedCount = 0;
  const validTrackIds = new Set<string>();

  try {
    const allEntries = await entries<string, any>();

    for (const [key, record] of allEntries) {
      const keyStr = String(key);

      // Only evaluate keys belonging to this app's store
      if (keyStr.startsWith(TRACK_PREFIX)) {
        let isValidTrack = false;
        let recordBytes = 0;

        if (record && typeof record === 'object') {
          // Check Uint8Array or ArrayBuffer size
          if (record.audioBuffer) {
            recordBytes = record.audioBuffer.byteLength || 0;
            if (recordBytes > 0) {
              isValidTrack = true;
            }
          }
          // Check legacy blob size
          else if (record.blob && record.blob instanceof Blob) {
            recordBytes = record.blob.size || 0;
            if (recordBytes > 0) {
              isValidTrack = true;
            }
          }
        }

        if (isValidTrack && record.id) {
          validTrackIds.add(record.id);
        } else {
          // Stale, aborted download, or corrupted 0-byte record
          freedBytes += recordBytes;
          await del(key);
          prunedCount++;
          console.log(`Pruned stale/corrupt record: ${keyStr}`);
        }
      }
    }

    // Clean orphaned favorite IDs from localStorage
    try {
      const savedFavorites = localStorage.getItem('tunes_favorites');
      if (savedFavorites) {
        const parsedFavorites: string[] = JSON.parse(savedFavorites);
        const filteredFavorites = parsedFavorites.filter((id) => validTrackIds.has(id));
        if (filteredFavorites.length !== parsedFavorites.length) {
          localStorage.setItem('tunes_favorites', JSON.stringify(filteredFavorites));
          console.log('Synchronized favorites list with valid database tracks.');
        }
      }
    } catch (favErr) {
      console.warn('Could not prune favorites list', favErr);
    }
  } catch (err) {
    console.error('Error during storage optimization:', err);
  }

  const freedFormatted = (freedBytes / (1024 * 1024)).toFixed(2) + ' MB';
  return { freedBytes, freedFormatted, prunedCount };
};