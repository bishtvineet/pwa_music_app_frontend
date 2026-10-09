export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  originalUrl: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  blob: Blob;
  createdAt: number;
  // Extended IndexedDB properties
  audioBlob?: Blob;
  thumbnailBlob?: Blob;
  downloadedAt?: number;
}