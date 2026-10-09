import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  ChevronDown,
  Music2,
} from 'lucide-react';
import type { Track } from '../types';
import type { RepeatMode } from '../hooks/useAudioPlayer';

interface PlayerViewProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  playbackContext: 'All' | 'Favorite';
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleRepeat: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  playbackContext,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  onToggleRepeat,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) setDragY(deltaY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 110) setIsExpanded(false);
    setDragY(0);
  };

  return (
    <>
      {/* 1. Floating Mini Player */}
      <div className="fixed bottom-20 left-0 right-0 z-30 px-5 max-w-md mx-auto w-full">
        <div
          onClick={() => setIsExpanded(true)}
          className="relative flex items-center justify-between p-2 pl-2.5 pr-3 rounded-2xl bg-[#181429]/90 border border-white/10 backdrop-blur-2xl shadow-2xl cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#241E38] shrink-0 border border-white/10 flex items-center justify-center">
              {currentTrack.thumbnailUrl && (currentTrack.thumbnailUrl.startsWith('data:image') || navigator.onLine) ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Music2 size={16} className="text-purple-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-white truncate">{currentTrack.title}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-[#8F8A9F] truncate">{currentTrack.artist}</p>
                <span className="text-[9px] text-[#555066]">•</span>
                <span className="text-[10px] text-purple-400/90 font-medium">From {playbackContext}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-600/30"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Expanded Modal Player */}
      {isExpanded && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          className="fixed inset-0 z-50 bg-[#0B0914] flex flex-col justify-between px-6 pb-8 pt-[max(env(safe-area-inset-top),1.5rem)] max-w-md mx-auto w-full overflow-hidden select-none touch-none animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/25 rounded-full blur-[110px] pointer-events-none" />
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 w-full flex justify-center pt-1 pb-2">
            <div className="w-10 h-1.5 rounded-full bg-white/20" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 active:scale-95"
            >
              <ChevronDown size={22} />
            </button>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">
                Playing from {playbackContext}
              </span>
              <p className="text-xs text-[#8F8A9F]">Offline Playback</p>
            </div>
            <button
              onClick={onToggleRepeat}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors active:scale-95 ${
                repeatMode !== 'off'
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-[#8F8A9F]'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          <div className="relative z-10 my-auto flex flex-col items-center">
            <div className="relative w-64 h-64 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(147,51,234,0.35)] border border-white/15 bg-[#181427] flex items-center justify-center">
              {currentTrack.thumbnailUrl && (currentTrack.thumbnailUrl.startsWith('data:image') || navigator.onLine) ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Music2 size={64} className="text-purple-400" />
              )}
            </div>
            <div className="mt-8 text-center px-4 w-full">
              <h2 className="text-xl font-bold text-white truncate">{currentTrack.title}</h2>
              <p className="text-sm text-purple-300/80 mt-1 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="relative z-10 w-full pb-4">
            <div className="mb-6">
              <div
                className="relative flex items-center h-7 py-2 touch-none"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onInput={(e) => onSeek(Number((e.target as HTMLInputElement).value))}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #A855F7 0%, #EC4899 ${progressPercent}%, rgba(255, 255, 255, 0.1) ${progressPercent}%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                  className="ios-scrubber w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10"
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-[#8F8A9F] mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8">
              <button onClick={onPrev} className="text-white/70 hover:text-white active:scale-90 transition-transform">
                <SkipBack size={28} />
              </button>
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={onNext} className="text-white/70 hover:text-white active:scale-90 transition-transform">
                <SkipForward size={28} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};