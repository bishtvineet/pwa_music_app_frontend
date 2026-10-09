import { useState, useRef, useEffect, useCallback } from 'react';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Track context queue: 'All' | 'Favorite'
  const [playbackContext, setPlaybackContext] = useState<'All' | 'Favorite'>('All');
  const activeQueueRef = useRef<Track[]>([]);

  // Persistent live refs
  const repeatModeRef = useRef<RepeatMode>('off');
  const currentTrackRef = useRef<Track | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const currentArtworkUrlRef = useRef<string | null>(null);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Clean up artwork Object URL
  const revokeArtworkUrl = useCallback(() => {
    if (currentArtworkUrlRef.current) {
      URL.revokeObjectURL(currentArtworkUrlRef.current);
      currentArtworkUrlRef.current = null;
    }
  }, []);

  // Clean up audio stream Object URL
  const revokeAudioUrl = useCallback(() => {
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  }, []);

  // Update MediaSession with lock-screen, Dynamic Island, and Control Center metadata
  const updateMediaSession = useCallback(
    (track: Track) => {
      if (!('mediaSession' in navigator)) return;

      revokeArtworkUrl();

      let artworkSrc = '';
      if (track.thumbnailBlob) {
        artworkSrc = URL.createObjectURL(track.thumbnailBlob);
        currentArtworkUrlRef.current = artworkSrc;
      } else if (track.thumbnailUrl) {
        artworkSrc = track.thumbnailUrl;
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Tunes Offline',
        artwork: artworkSrc
          ? [
              { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '128x128', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '192x192', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '384x384', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });

      navigator.mediaSession.playbackState = 'playing';
    },
    [revokeArtworkUrl]
  );

  const playTrack = useCallback(
    (track: Track, context: 'All' | 'Favorite' = 'All', queue: Track[] = []) => {
      const audio = audioRef.current;
      if (!audio) return;

      setPlaybackContext(context);
      if (queue.length > 0) {
        activeQueueRef.current = queue;
      }

      // Revoke prior Object URL before allocating a new one
      revokeAudioUrl();

      const audioBlob = track.audioBlob || track.blob;
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudioUrlRef.current = audioUrl;

      audio.src = audioUrl;
      audio.load();

      audio
        .play()
        .then(() => {
          setCurrentTrack(track);
          currentTrackRef.current = track;
          setIsPlaying(true);
          updateMediaSession(track);
        })
        .catch((err) => {
          console.error('Audio playback error:', err);
        });
    },
    [revokeAudioUrl, updateMediaSession]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;

    if (isPlaying) {
      audio.pause();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      audio
        .play()
        .then(() => {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        })
        .catch(console.error);
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration || 0,
          playbackRate: audio.playbackRate,
          position: time,
        });
      } catch {
        // Safe catch for browsers with incomplete setPositionState support
      }
    }
  }, []);

  const nextTrack = useCallback(() => {
    const queue = activeQueueRef.current;
    const track = currentTrackRef.current;
    if (!queue.length || !track) return;

    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1], playbackContext, queue);
    } else {
      playTrack(queue[0], playbackContext, queue);
    }
  }, [playbackContext, playTrack]);

  const prevTrack = useCallback(() => {
    const queue = activeQueueRef.current;
    const track = currentTrackRef.current;
    const audio = audioRef.current;
    if (!queue.length || !track || !audio) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1], playbackContext, queue);
    } else {
      playTrack(queue[queue.length - 1], playbackContext, queue);
    }
  }, [playbackContext, playTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      let next: RepeatMode = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';
      repeatModeRef.current = next;
      return next;
    });
  }, []);

  // Audio setup & cleanup
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } catch {
          // Ignore
        }
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const onEnded = () => {
      const mode = repeatModeRef.current;
      const currentAudio = audioRef.current;

      if (mode === 'one') {
        if (currentAudio) {
          currentAudio.currentTime = 0;
          currentAudio.play().catch(console.error);
        }
      } else if (mode === 'all') {
        nextTrack();
      } else {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);

      revokeAudioUrl();
      revokeArtworkUrl();
    };
  }, [nextTrack, revokeAudioUrl, revokeArtworkUrl]);

  // MediaSession Action Handlers (Lock Screen & Dynamic Island)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seek(details.seekTime);
      }
    });

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [nextTrack, prevTrack, seek]);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    playbackContext,
    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    toggleRepeat,
  };
};