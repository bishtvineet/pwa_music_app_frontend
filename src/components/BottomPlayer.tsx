import React from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import type { Track } from '../types';
import { formatDuration } from '../services/api';

interface BottomPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
}) => {
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-apple-surface/90 backdrop-blur-xl border-t border-apple-border pb-safe">
      {/* Mini Progress scrubber line */}
      <div 
        className="w-full h-1 bg-zinc-800 relative cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          onSeek(percent * (duration || currentTrack.duration));
        }}
      >
        <div
          className="h-full bg-apple-red transition-all duration-100"
          style={{ width: `${(currentTime / (duration || currentTrack.duration || 1)) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Track Thumbnail & Title */}
        <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
          <img
            src={currentTrack.thumbnailUrl || '/placeholder.png'}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover shadow-sm flex-shrink-0"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold truncate text-white">{currentTrack.title}</h4>
            <p className="text-xs text-apple-textMuted truncate">
              {currentTrack.artist} • {formatDuration(currentTime)} / {currentTrack.durationFormatted}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrev}
            className="p-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-3 bg-white text-black rounded-full active:scale-90 transition-transform shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>
          <button
            onClick={onNext}
            className="p-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};