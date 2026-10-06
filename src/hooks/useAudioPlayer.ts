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

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Lock screen media session
  const updateMediaSession = useCallback((track: Track) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Tunes Offline',
        artwork: track.thumbnailUrl
          ? [{ src: track.thumbnailUrl, sizes: '512x512', type: 'image/png' }]
          : [],
      });
    }
  }, []);

  const playTrack = useCallback(
    (track: Track, context: 'All' | 'Favorite' = 'All', queue: Track[] = []) => {
      const audio = audioRef.current;
      if (!audio) return;

      setPlaybackContext(context);
      if (queue.length > 0) {
        activeQueueRef.current = queue;
      }

      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }

      const audioUrl = URL.createObjectURL(track.blob);
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
    [updateMediaSession]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Manual next button skip (always allowed when explicitly pressed)
  const nextTrack = useCallback(() => {
    const queue = activeQueueRef.current;
    const track = currentTrackRef.current;
    if (!queue.length || !track) return;

    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1], playbackContext, queue);
    } else {
      // Loop back to start on manual skip
      playTrack(queue[0], playbackContext, queue);
    }
  }, [playbackContext, playTrack]);

  // Manual prev button skip
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

  // Audio setup
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      const mode = repeatModeRef.current;
      const currentAudio = audioRef.current;

      if (mode === 'one') {
        // Repeat single song
        if (currentAudio) {
          currentAudio.currentTime = 0;
          currentAudio.play().catch(console.error);
        }
      } else if (mode === 'all') {
        // Advance to next song only when repeat is 'all'
        nextTrack();
      } else {
        // Repeat OFF: Stop completely, do NOT advance
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        setIsPlaying(false);
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
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [nextTrack]);

  // MediaSession Lock Screen
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    }
  }, [nextTrack, prevTrack]);

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