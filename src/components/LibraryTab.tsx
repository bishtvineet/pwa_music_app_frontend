import React, { useState, useMemo } from 'react';
import { Search, Trash2, Music2, HardDrive, Sparkles, MoreVertical } from 'lucide-react';
import type { Track } from '../types';

export interface LibraryTabProps {
  tracks: Track[];
  currentTrack?: Track | null;
  currentTrackId?: string | undefined;
  isPlaying?: boolean;
  onSelectTrack: (track: Track) => void;
  onDeleteTrack: (id: string, e?: React.MouseEvent) => void | Promise<void>;
  storageUsage?: string;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  tracks,
  currentTrack,
  currentTrackId,
  isPlaying = false,
  onSelectTrack,
  onDeleteTrack,
  storageUsage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Active track ID resolution supporting both prop formats
  const activeId = currentTrack?.id || currentTrackId;

  // Filtered tracks based on search input
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  // Fallback calculation for total offline storage usage if storageUsage is not supplied
  const calculatedStorage = useMemo(() => {
    const totalBytes = tracks.reduce((sum, track) => sum + (track.blob?.size || 0), 0);
    const mb = totalBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, [tracks]);

  const displayStorage = storageUsage || calculatedStorage;

  return (
    <div className="flex flex-col flex-1 pb-32 pt-2 px-4 max-w-lg mx-auto w-full select-none">
      {/* Header Section */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-accent-pink text-xs font-semibold tracking-wider uppercase mb-0.5">
            <Sparkles size={13} className="text-accent-pink animate-pulse" />
            <span>Smart Library</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Your Music</h1>
        </div>

        {/* Offline storage badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-elevated/80 border border-white/10 backdrop-blur-md shadow-inner">
          <HardDrive size={13} className="text-accent-purple" />
          <span className="text-xs font-medium text-subtext">{displayStorage}</span>
        </div>
      </div>

      {/* Modern Pill Search Bar */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtext/70 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tracks, artists..."
          className="w-full bg-canvas-surface/80 text-white placeholder-subtext/60 pl-10 pr-4 py-2.5 rounded-xl border border-white/5 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20 transition-all text-sm backdrop-blur-xl"
        />
      </div>

      {/* Empty State */}
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-canvas-surface border border-white/10 flex items-center justify-center mb-4 shadow-glow-purple/20">
            <Music2 size={28} className="text-accent-purple" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No songs saved yet</h3>
          <p className="text-sm text-subtext max-w-xs">
            Paste a YouTube link in the Converter tab to save and listen completely offline.
          </p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="text-center py-16 text-subtext text-sm">
          No matching tracks found for "{searchQuery}".
        </div>
      ) : (
        /* Track List */
        <div className="flex flex-col gap-2.5">
          {filteredTracks.map((track) => {
            const isCurrent = activeId === track.id;
            const isMenuOpen = activeMenuId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track)}
                className={`relative group flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-gradient-to-r from-canvas-elevated via-canvas-surface to-canvas-elevated border border-accent-purple/50 shadow-glow-purple'
                    : 'bg-canvas-surface/60 hover:bg-canvas-surface border border-white/5 backdrop-blur-xl'
                }`}
              >
                {/* Left: Thumbnail & Equalizer Overlay */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-canvas-elevated shadow-md border border-white/10">
                    {track.thumbnailUrl ? (
                      <img
                        src={track.thumbnailUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-canvas-elevated">
                        <Music2 size={20} className="text-subtext" />
                      </div>
                    )}

                    {/* Equalizer Indicator for the active track */}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-end justify-center pb-2.5 gap-0.5">
                        <span className={`w-1 rounded-full bg-accent-pink ${isPlaying ? 'animate-eq-1' : 'h-1.5'}`} />
                        <span className={`w-1 rounded-full bg-accent-purple ${isPlaying ? 'animate-eq-2' : 'h-3'}`} />
                        <span className={`w-1 rounded-full bg-accent-violet ${isPlaying ? 'animate-eq-3' : 'h-2'}`} />
                      </div>
                    )}
                  </div>

                  {/* Middle: Title, Artist & Duration */}
                  <div className="min-w-0 flex-1 pr-2">
                    <p
                      className={`text-sm font-semibold truncate leading-tight ${
                        isCurrent
                          ? 'bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent'
                          : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-subtext truncate max-w-[150px]">{track.artist}</p>
                      <span className="text-[10px] text-subtext/40">•</span>
                      <span className="text-[11px] font-mono text-subtext/80">{track.durationFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions Menu */}
                <div className="relative flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : track.id);
                    }}
                    className="p-2 rounded-full text-subtext/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Dropdown Context Menu */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-10 w-36 py-1.5 bg-canvas-elevated/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-20"
                    >
                      <button
                        onClick={(e) => {
                          onDeleteTrack(track.id, e);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Delete Offline</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};