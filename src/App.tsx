import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ChevronLeft,
  Home,
  Music,
  Radio,
  X,
  Sparkle,
  Lock,
  Upload,
  Key,
  ShieldCheck,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Heart,
  Trash2,
  Music2,
  Play,
  Pause,
  HardDrive,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { getAllTracks, deleteTrack, saveTrack, pruneStaleStorage } from './services/storage';
import { ConverterTab } from './components/ConverterTab';
import { SettingsTab } from './components/SettingsTab';
import { PlayerView } from './components/PlayerView';
import { SplashScreen } from './components/SplashScreen';
import { ImageAdjustModal, type SplashConfig } from './components/ImageAdjustModal';
import { getInitials, formatDisplayName } from './utils/user';
import { sha256, ADMIN_PASSWORD_HASH, ADMIN_KEY_HASH } from './utils/crypto';
import type { Track } from './types';
import { getSavedNetworkMode, type NetworkMode } from './services/network';
import { pingRenderHealth } from './services/api';

type TabType = 'all' | 'favorite' | 'convert' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [previousTab, setPreviousTab] = useState<TabType>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tunes_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => getSavedNetworkMode());

  // Compact header action states
  const [isWakingHost, setIsWakingHost] = useState(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);

  // User flow state
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('tunes_user_name') || '');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState<boolean>(() => !localStorage.getItem('tunes_user_name'));
  const [showSplash, setShowSplash] = useState<boolean>(() => !!localStorage.getItem('tunes_user_name'));

  const [splashConfig, setSplashConfig] = useState<SplashConfig | null>(() => {
    try {
      const saved = localStorage.getItem('tunes_splash_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Admin Verification
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
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

  const refreshLibrary = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
      const stored = await getAllTracks();
      setTracks(stored.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to load tracks', err);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  const showNotification = (message: string, type: 'info' | 'success' | 'warning') => {
    setStatusNotice({ message, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Header Action: Wake Up Host
  const handleWakeUpHost = async () => {
    if (isWakingHost) return;
    setIsWakingHost(true);
    showNotification('Pinging Render to wake container (cold start may take 30-50s)...', 'info');

    const result = await pingRenderHealth();
    setIsWakingHost(false);

    if (result.ok) {
      showNotification(`Render host is awake & ready! (${result.timeMs}ms)`, 'success');
    } else {
      showNotification(`Could not reach Render after ${result.timeMs}ms. Try again shortly.`, 'warning');
    }
  };

  // Header Action: Optimize Storage
  const handleCleanStorage = async () => {
    if (isCleaningStorage) return;
    setIsCleaningStorage(true);

    try {
      const result = await pruneStaleStorage();
      await refreshLibrary();

      if (result.prunedCount > 0) {
        showNotification(`Cleaned ${result.prunedCount} orphaned item(s). Space freed!`, 'success');
      } else {
        showNotification('Storage is clean! No orphan data found.', 'info');
      }
    } catch {
      showNotification('Could not complete storage cleanup.', 'warning');
    } finally {
      setIsCleaningStorage(false);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    localStorage.setItem('tunes_user_name', trimmed);
    setUserName(trimmed);
    setShowNameModal(false);
    setShowSplash(true);
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const passHash = await sha256(adminPassword.trim());
    const keyHash = await sha256(adminKey.trim());

    if (passHash === ADMIN_PASSWORD_HASH && keyHash === ADMIN_KEY_HASH) {
      setIsAdminAuthenticated(true);
      setAdminError(null);
    } else {
      setAdminError('Invalid Admin credentials.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDimension = 960;
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        setPendingImageSrc(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    playTrack(newTrack, 'All', [newTrack, ...tracks]);
  };

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTrack(id);
    await refreshLibrary();
  };

  const displayedTracks = useMemo(() => {
    let list = tracks;
    if (activeTab === 'favorite') {
      list = tracks.filter((t) => favoriteIds.includes(t.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    return list;
  }, [tracks, activeTab, favoriteIds, searchQuery]);

  const totalStorage = useMemo(() => {
    const bytes = tracks.reduce((sum, t) => sum + (t.blob?.size || 0), 0);
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [tracks]);

  return (
    <div className="relative min-h-screen bg-[#0D0B14] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. Name Prompt Modal for First Launch */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 bg-[#0D0B14] flex items-center justify-center px-6 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#171426] border border-white/10 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Sparkle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">What should we call you?</h2>
            <p className="text-xs text-[#8F8A9F] mt-1 mb-5">Enter your name to personalize your offline music player.</p>
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

      {/* Admin Photo Gate Modal */}
      {showAdminGate && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-center justify-center px-6 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#181428] border border-white/15 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-purple-400" />
                <h3 className="text-base font-bold text-white">Admin Access</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminGate(false);
                  setIsAdminAuthenticated(false);
                  setAdminPassword('');
                  setAdminKey('');
                  setAdminError(null);
                }}
                className="text-[#8F8A9F] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <form onSubmit={handleAdminVerify} className="flex flex-col gap-3">
                <p className="text-xs text-[#8F8A9F] mb-1">Enter credentials to unlock custom splash photo settings.</p>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F8A9F]" />
                  <input
                    type="password"
                    placeholder="Admin Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#120F20] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#686278] focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="relative">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F8A9F]" />
                  <input
                    type="password"
                    placeholder="Secret Key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full bg-[#120F20] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#686278] focus:outline-none focus:border-purple-500"
                  />
                </div>
                {adminError && <p className="text-[11px] text-red-400 font-medium">{adminError}</p>}
                <button type="submit" className="mt-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors">
                  Verify Access
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 py-2">
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Admin Authenticated
                </p>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
                >
                  <Upload size={16} />
                  <span>Choose Background Photo (iPhone)</span>
                </button>
                {splashConfig?.image && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <span className="flex items-center gap-2 text-white/80">
                      <ImageIcon size={15} className="text-purple-400" /> Current Image Active
                    </span>
                    <button
                      onClick={() => { localStorage.removeItem('tunes_splash_config'); setSplashConfig(null); }}
                      className="text-red-400 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Photo Modal */}
      {pendingImageSrc && (
        <ImageAdjustModal
          imageSrc={pendingImageSrc}
          onCancel={() => setPendingImageSrc(null)}
          onConfirm={(config) => {
            try {
              localStorage.setItem('tunes_splash_config', JSON.stringify(config));
              setSplashConfig(config);
              setPendingImageSrc(null);
              setShowAdminGate(false);
              showNotification('Custom splash background saved successfully!', 'success');
            } catch {
              setAdminError('Storage quota exceeded. Please choose a lighter image.');
            }
          }}
        />
      )}

      {/* 2. Splash Screen */}
      {showSplash && !showNameModal && (
        <SplashScreen onFinish={() => setShowSplash(false)} backgroundConfig={splashConfig} />
      )}

      {/* FLOATING TOP TOAST */}
      {statusNotice && (
        <div
          className={`fixed top-[max(env(safe-area-inset-top,1rem),1rem)] left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[80] px-4 py-3 rounded-2xl border text-xs font-medium shadow-2xl backdrop-blur-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
              : statusNotice.type === 'info'
              ? 'bg-[#1D1735]/95 border-purple-500/40 text-purple-200 shadow-purple-950/50'
              : 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/50'
          }`}
        >
          <span className="pr-2 leading-relaxed">{statusNotice.message}</span>
          <button
            onClick={() => setStatusNotice(null)}
            className="p-1 hover:text-white opacity-80 hover:opacity-100 rounded-lg active:scale-90 transition-all shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3. Main Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-700 ease-out ${
          showSplash || showNameModal ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Glow ambient background: Only active when splash is dismissed to prevent color bleeding */}
        {!showSplash && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-80 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        )}

        <div className="flex-1 w-full max-w-md mx-auto px-5 pt-[max(env(safe-area-inset-top),3.5rem)] pb-36 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between mb-4 pt-[4%]">
            {activeTab === 'settings' ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab(previousTab === 'settings' ? 'all' : previousTab)}
                    className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform hover:text-white"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">App Settings</h1>
                    <p className="text-[11px] text-[#8F8A9F]">Preferences & routing</p>
                  </div>
                </div>

                {/* COMPACT TOOLBAR */}
                <div className="flex items-center gap-1.5">
                  {/* 1. Offline Storage Box */}
                  <div
                    title={`Offline storage: ${totalStorage}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1C182B]/80 border border-white/10 text-xs font-mono font-bold text-purple-300 shadow-inner"
                  >
                    <HardDrive size={13} className="text-purple-400" />
                    <span className="text-[11px]">{totalStorage}</span>
                  </div>

                  {/* 2. Optimize Storage Button */}
                  <button
                    onClick={handleCleanStorage}
                    disabled={isCleaningStorage}
                    title="Optimize Storage (Clean orphan data)"
                    className="w-8 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-300 active:scale-90 transition-all disabled:opacity-50"
                  >
                    {isCleaningStorage ? (
                      <Loader2 size={14} className="animate-spin text-amber-300" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                  </button>

                  {/* 3. Wake Up Render Host Button */}
                  <button
                    onClick={handleWakeUpHost}
                    disabled={isWakingHost}
                    title="Wake up Render backend host"
                    className="w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center text-emerald-300 active:scale-90 transition-all disabled:opacity-50"
                  >
                    {isWakingHost ? (
                      <Loader2 size={14} className="animate-spin text-emerald-300" />
                    ) : (
                      <Zap size={14} />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md shrink-0">
                    <div className="w-full h-full rounded-full bg-[#1A162B] flex items-center justify-center text-xs font-bold text-white tracking-wider">
                      {getInitials(userName)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold tracking-tight text-white truncate max-w-[170px]">
                      Hellos, {formatDisplayName(userName)}
                    </h1>
                    <p className="text-[11px] text-[#8F8A9F]">Ready for your offline tunes?</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSearchInput(!showSearchInput)}
                    className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform hover:text-white"
                  >
                    <Search size={18} />
                  </button>
                  <button
                    onClick={() => { setPreviousTab(activeTab); setActiveTab('settings'); }}
                    title="Settings"
                    className="w-10 h-10 rounded-full bg-[#1C182B]/80 border border-white/10 flex items-center justify-center text-[#A6A0B8] active:scale-95 transition-transform hover:text-white"
                  >
                    <SettingsIcon size={18} />
                  </button>
                </div>
              </>
            )}
          </header>

          {/* Collapsible Search */}
          {showSearchInput && activeTab !== 'settings' && (
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

          {/* Tabs Pill Switcher */}
          {activeTab !== 'settings' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
              {(['all', 'favorite', 'convert'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-[#1C182B]/80 text-[#8F8A9F] border border-white/5 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'settings' ? (
            <SettingsTab
              networkMode={networkMode}
              onNetworkModeChange={setNetworkMode}
              onOpenAdminGate={() => setShowAdminGate(true)}
              onNotify={showNotification}
            />
          ) : activeTab === 'convert' ? (
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
                        onClick={() => playTrack(track, activeTab === 'favorite' ? 'Favorite' : 'All', displayedTracks)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          isCurrent
                            ? 'bg-[#1E1933] border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                            : 'bg-[#151221]/70 border border-white/5 hover:bg-[#1A162B]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#241E38] shrink-0 border border-white/10 shadow flex items-center justify-center">
                            {track.thumbnailUrl && (track.thumbnailUrl.startsWith('data:image') || navigator.onLine) ? (
                              <img
                                src={track.thumbnailUrl}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Music2 size={18} className="text-purple-400" />
                            )}
                          </div>

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

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => toggleFavorite(track.id, e)}
                            className="p-1.5 text-[#8F8A9F] hover:text-pink-500 transition-colors"
                          >
                            <Heart size={18} className={isFavorite ? 'fill-pink-500 text-pink-500' : ''} />
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
                            {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
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

        {/* Bottom Navigation */}
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
              className={`p-2 transition-colors ${activeTab === 'favorite' ? 'text-purple-400' : 'text-[#8F8A9F] hover:text-white'}`}
            >
              <Music size={20} />
            </button>
            <button
              onClick={() => setActiveTab('convert')}
              className={`p-2 transition-colors ${activeTab === 'convert' ? 'text-purple-400' : 'text-[#8F8A9F] hover:text-white'}`}
            >
              <Radio size={20} />
            </button>
          </div>
        </div>

        {/* Isolated Audio Player Controls */}
        <PlayerView
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          repeatMode={repeatMode}
          playbackContext={playbackContext}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onNext={nextTrack}
          onPrev={prevTrack}
          onToggleRepeat={toggleRepeat}
        />
      </div>
    </div>
  );
};

export default App;