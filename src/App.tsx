import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  Search,
  HardDrive,
  Heart,
  Trash2,
  Music2,
  ChevronDown,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Home,
  Music,
  Radio,
  RotateCw,
  Sparkles,
  X,
  Sparkle
} from 'lucide-react';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { getAllTracks, deleteTrack, saveTrack, pruneStaleStorage } from './services/storage';
import { ConverterTab } from './components/ConverterTab';
import { checkForAppUpdate } from './services/updater';
import { SplashScreen } from './components/SplashScreen';
import { getInitials, formatDisplayName } from './utils/user';
import type { Track } from './types';

type TabType = 'all' | 'favorite' | 'convert';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tunes_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User Profile State
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('tunes_user_name') || '';
  });
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState<boolean>(() => {
    return !localStorage.getItem('tunes_user_name');
  });

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Swipe-down dismiss state for expanded modal player
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const {
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
  } = useAudioPlayer();

  // Load tracks and request iOS persistent storage
  const refreshLibrary = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
      const stored = await getAllTracks();
      setTracks(stored.sort((a: Track, b: Track) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to load tracks', err);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 110) {
      setIsExpandedPlayerOpen(false);
    }
    setDragY(0);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    localStorage.setItem('tunes_user_name', trimmed);
    setUserName(trimmed);
    setShowNameModal(false);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('tunes_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const handleTrackSaved = async (newTrack: Track) => {
    await saveTrack(newTrack);
    await refreshLibrary();
    setActiveTab('all');
    const updatedTracks = [newTrack, ...tracks];
    playTrack(newTrack, 'All', updatedTracks);
  };

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTrack(id);
    await refreshLibrary();
  };

  // Filtered tracks based on tab and search
  const displayedTracks = useMemo(() => {
    let list = tracks;
    if (activeTab === 'favorite') {
      list = tracks.filter((t) => favoriteIds.includes(t.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, activeTab, favoriteIds, searchQuery]);

  const handleSelectTrack = (track: Track) => {
    const context = activeTab === 'favorite' ? 'Favorite' : 'All';
    playTrack(track, context, displayedTracks);
  };

  // Total Storage Size
  const totalStorage = useMemo(() => {
    const bytes = tracks.reduce((sum, t) => sum + (t.blob?.size || 0), 0);
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [tracks]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    setStatusNotice(null);

    const result = await checkForAppUpdate();
    setIsCheckingUpdate(false);

    if (!result.success) {
      setStatusNotice({ message: result.message, type: 'warning' });
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  const handleCleanStorage = async () => {
    if (isCleaningStorage) return;
    setIsCleaningStorage(true);
    setStatusNotice(null);

    try {
      const result = await pruneStaleStorage();
      await refreshLibrary();

      const currentFavs = localStorage.getItem('tunes_favorites');
      if (currentFavs) {
        setFavoriteIds(JSON.parse(currentFavs));
      }

      if (result.prunedCount > 0) {
        setStatusNotice({
          message: `Cleaned ${result.prunedCount} orphaned item(s). Reclaimed space!`,
          type: 'success',
        });
      } else {
        setStatusNotice({
          message: 'Storage is clean! No corrupted or orphan data found.',
          type: 'info',
        });
      }
    } catch {
      setStatusNotice({
        message: 'Could not complete storage cleanup.',
        type: 'warning',
      });
    } finally {
      setIsCleaningStorage(false);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0D0B14] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Cinematic Splash Screen Overlay */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* First-Time User Name Prompt Modal */}
      {showNameModal && !showSplash && (
        <div className="fixed inset-0 z-50 bg-[#0D0B14]/90 backdrop-blur-xl flex items-center justify-center px-6 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#171426] border border-white/10 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Sparkle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">What should we call you?</h2>
            <p className="text-xs text-[#8F8A9F] mt-1 mb-5">
              Enter your name to personalize your offline music player.
            </p>

            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Vineet Bisht"
                className="w-full bg-[#120F20] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#686278] focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50 transition-all"
              >
                Let's Listen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main App Container: Smoothly cross-fades & blurs in as splash dissolves */}
      <div
        className={`flex-1 flex flex-col transition-all duration-700 ease-out ${
          showSplash ? 'opacity-0 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'
        }`}
      >
        {/* Dynamic Ambient Background Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-80 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Main Container with Safe Area Notch Inset */}
        <div className="flex-1 w-full max-w-md mx-auto px-5 pt-[max(env(safe-area-inset-top),3.5rem)] pb-36 flex flex-col">
          {/* Top Header */}
          <header className="flex items-center justify-between mb-4 pt-[4%]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md shrink-0">
                <div className="w-full h-full rounded-full bg-[#1A162B] flex items-center justify-center text-xs font-bold text-white tracking-wider">
                  {getInitials(userName)}
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-white truncate max-w-[170px]">
                  Hello, {formatDisplayName(userName)}
                </h1>
                <p className="text-[11px] text-[#8F8A9F]">Ready for your offline tunes?</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Optimize & Prune Junk Storage Button */}
              <button
                onClick={handleCleanStorage}
                title="Optimize storage & prune junk"
                disabled={isCleaningStorage}
                className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform hover:text-white disabled:opacity-50"
              >
                <Sparkles size={16} className={isCleaningStorage ? 'animate-pulse text-amber-400' : ''} />
              </button>

              {/* Check for Update Button */}
              <button
                onClick={handleCheckUpdate}
                title="Check for update"
                disabled={isCheckingUpdate}
                className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform hover:text-white disabled:opacity-50"
              >
                <RotateCw size={16} className={isCheckingUpdate ? 'animate-spin text-purple-400' : ''} />
              </button>

              {/* Search Toggle */}
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform"
              >
                <Search size={18} />
              </button>

              {/* Storage Counter */}
              <div className="px-3 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center gap-1.5 text-[11px] text-[#A6A0B8]">
                <HardDrive size={14} className="text-purple-400" />
                <span>{totalStorage}</span>
              </div>
            </div>
          </header>

          {/* Dynamic Status Notification Banner */}
          {statusNotice && (
            <div
              className={`mb-4 px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
                statusNotice.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : statusNotice.type === 'info'
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-200'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              }`}
            >
              <span className="pr-2">{statusNotice.message}</span>
              <button
                onClick={() => setStatusNotice(null)}
                className="p-0.5 hover:text-white opacity-80 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Collapsible Search Bar */}
          {showSearchInput && (
            <div className="relative mb-4 animate-in fade-in duration-200">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F8A9F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or artist..."
                autoFocus
                className="w-full bg-[#181427] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-[#686278] focus:outline-none focus:border-purple-500/50"
              />
            </div>
          )}

          {/* 3 Main Tabs: All, Favorite, Convert */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#1C182B]/80 text-[#8F8A9F] border border-white/5 hover:text-white'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setActiveTab('favorite')}
              className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === 'favorite'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#1C182B]/80 text-[#8F8A9F] border border-white/5 hover:text-white'
              }`}
            >
              Favorite
            </button>

            <button
              onClick={() => setActiveTab('convert')}
              className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === 'convert'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#1C182B]/80 text-[#8F8A9F] border border-white/5 hover:text-white'
              }`}
            >
              Convert
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'convert' ? (
            <div className="pt-1">
              <ConverterTab onTrackSaved={handleTrackSaved} />
            </div>
          ) : (
            <section className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-white capitalize">{activeTab} Tracks</h2>
                <span className="text-xs text-[#8F8A9F] font-medium">{displayedTracks.length} items</span>
              </div>

              {displayedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-[#8F8A9F]">
                  <Music2 size={36} className="text-purple-500/40 mb-3" />
                  <p className="text-sm font-medium">No tracks found</p>
                  <p className="text-xs mt-1">
                    {activeTab === 'favorite' ? 'Tap the heart icon on any song to save it here.' : 'Use Convert to add music.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedTracks.map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isFavorite = favoriteIds.includes(track.id);

                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          isCurrent
                            ? 'bg-[#1E1933] border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                            : 'bg-[#151221]/70 border border-white/5 hover:bg-[#1A162B]'
                        }`}
                      >
                        {/* Left: Thumbnail */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#241E38] shrink-0 border border-white/10 shadow">
                            {track.thumbnailUrl ? (
                              <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music2 size={18} className="text-purple-400" />
                              </div>
                            )}
                          </div>

                          {/* Title & Artist */}
                          <div className="min-w-0 flex-1 pr-2">
                            <p className={`text-sm font-semibold truncate leading-tight ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-[#8F8A9F] truncate max-w-[120px]">{track.artist}</p>
                              <span className="text-[9px] text-[#555066]">•</span>
                              <span className="text-[11px] font-mono text-[#8F8A9F]">{track.durationFormatted}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => toggleFavorite(track.id, e)}
                            className="p-1.5 text-[#8F8A9F] hover:text-pink-500 transition-colors"
                          >
                            <Heart
                              size={18}
                              className={isFavorite ? 'fill-pink-500 text-pink-500' : ''}
                            />
                          </button>

                          <button
                            onClick={(e) => handleDeleteTrack(track.id, e)}
                            className="p-1.5 text-[#8F8A9F] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              isCurrent && isPlaying
                                ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-600/30'
                                : 'bg-white/10 text-white hover:bg-white/15'
                            }`}
                          >
                            {isCurrent && isPlaying ? (
                              <Pause size={16} fill="currentColor" />
                            ) : (
                              <Play size={16} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Floating Bottom Navigation Bar */}
        <div className="fixed bottom-4 left-0 right-0 z-40 px-6 max-w-sm mx-auto w-full">
          <div className="relative flex items-center justify-around py-2.5 px-4 rounded-full bg-[#151221]/90 border border-white/10 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => setActiveTab('all')}
              className={`w-12 h-12 -my-2 rounded-full flex items-center justify-center transition-all shadow-lg ${
                activeTab === 'all'
                  ? 'bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-purple-600/50 scale-105'
                  : 'text-[#8F8A9F] hover:text-white'
              }`}
            >
              <Home size={20} />
            </button>

            <button
              onClick={() => setActiveTab('favorite')}
              className={`p-2 transition-colors ${
                activeTab === 'favorite' ? 'text-purple-400' : 'text-[#8F8A9F] hover:text-white'
              }`}
            >
              <Music size={20} />
            </button>

            <button
              onClick={() => setActiveTab('convert')}
              className={`p-2 transition-colors ${
                activeTab === 'convert' ? 'text-purple-400' : 'text-[#8F8A9F] hover:text-white'
              }`}
            >
              <Radio size={20} />
            </button>
          </div>
        </div>

        {/* Floating Mini Player */}
        {currentTrack && (
          <div className="fixed bottom-20 left-0 right-0 z-30 px-5 max-w-md mx-auto w-full">
            <div
              onClick={() => setIsExpandedPlayerOpen(true)}
              className="relative flex items-center justify-between p-2 pl-2.5 pr-3 rounded-2xl bg-[#181429]/90 border border-white/10 backdrop-blur-2xl shadow-2xl cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
            >
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#241E38] shrink-0 border border-white/10">
                  {currentTrack.thumbnailUrl ? (
                    <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 size={16} className="text-purple-400" />
                    </div>
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
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-600/30"
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Modal Player with Swipe-Down Gesture */}
        {isExpandedPlayerOpen && currentTrack && (
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
            {/* Internal Ambient Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/25 rounded-full blur-[110px] pointer-events-none" />
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />

            {/* Swipe Indicator Bar */}
            <div className="relative z-10 w-full flex justify-center pt-1 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between">
              <button
                onClick={() => setIsExpandedPlayerOpen(false)}
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
                onClick={toggleRepeat}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors active:scale-95 ${
                  repeatMode !== 'off'
                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-[#8F8A9F]'
                }`}
              >
                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>
            </div>

            {/* Large Cover Art */}
            <div className="relative z-10 my-auto flex flex-col items-center">
              <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(147,51,234,0.35)] border border-white/15 bg-[#181427]">
                {currentTrack.thumbnailUrl ? (
                  <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#181427] flex items-center justify-center">
                    <Music2 size={64} className="text-purple-400" />
                  </div>
                )}
              </div>
              <div className="mt-8 text-center px-4 w-full">
                <h2 className="text-xl font-bold text-white truncate">{currentTrack.title}</h2>
                <p className="text-sm text-purple-300/80 mt-1 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Scrubber & Playback Controls */}
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
                    onInput={(e) => seek(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => seek(Number(e.target.value))}
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
                <button
                  onClick={prevTrack}
                  className="text-white/70 hover:text-white active:scale-90 transition-transform"
                >
                  <SkipBack size={28} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-95 transition-transform"
                >
                  {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
                </button>
                <button
                  onClick={nextTrack}
                  className="text-white/70 hover:text-white active:scale-90 transition-transform"
                >
                  <SkipForward size={28} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;