import React, { useState } from 'react';
import {
  RotateCw,
  Lock,
  ChevronDown,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  Network,
} from 'lucide-react';
import { checkForAppUpdate } from '../services/updater';
import { syncCookiesToBackend } from '../services/api';
import {
  NETWORK_MODES,
  setSavedNetworkMode,
  type NetworkMode,
} from '../services/network';

interface SettingsTabProps {
  networkMode: NetworkMode;
  onNetworkModeChange: (mode: NetworkMode) => void;
  onOpenAdminGate: () => void;
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  networkMode,
  onNetworkModeChange,
  onOpenAdminGate,
  onNotify,
}) => {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isCookieSyncOpen, setIsCookieSyncOpen] = useState(false);

  // Cookie sync state
  const [cookieMode, setCookieMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cookieText, setCookieText] = useState('');
  const [isSyncingCookies, setIsSyncingCookies] = useState(false);
  const [cookieStatus, setCookieStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);

    try {
      const result = await checkForAppUpdate();
      setIsCheckingUpdate(false);

      if (result.success) {
        onNotify(result.message || 'Your app is up to date!', 'success');
      } else {
        onNotify(result.message, 'warning');
      }
    } catch {
      setIsCheckingUpdate(false);
      onNotify('Update check failed. Check your internet connection.', 'warning');
    }
  };

  const handleSyncCookies = async () => {
    setIsSyncingCookies(true);
    setCookieStatus({ type: 'idle', message: '' });

    try {
      const payload = cookieMode === 'file' ? selectedFile : cookieText.trim();
      if (!payload) return;

      const res = await syncCookiesToBackend(payload);
      setCookieStatus({ type: 'success', message: res.message || 'Cookies synced successfully!' });
      setSelectedFile(null);
      setCookieText('');
    } catch (err: any) {
      setCookieStatus({
        type: 'error',
        message: err.message || 'Failed to update cookies on server.',
      });
    } finally {
      setIsSyncingCookies(false);
    }
  };

  const handleSelectMode = (mode: NetworkMode) => {
    setSavedNetworkMode(mode);
    onNetworkModeChange(mode);
    onNotify(`Routing mode: ${NETWORK_MODES[mode].label}`, 'info');
  };

  return (
    <section className="flex-1 flex flex-col gap-3 animate-in fade-in duration-200">
      {/* 1. Network Routing Selector */}
      <div className="w-full rounded-2xl bg-[#151221]/80 border border-white/10 transition-all text-left overflow-hidden">
        <button
          type="button"
          onClick={() => setIsNetworkOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A162B]/50 transition-colors active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Network size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-white">Network & Relay Route</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  {NETWORK_MODES[networkMode].badge}
                </span>
              </div>
              <p className="text-[11px] text-[#8F8A9F]">Select endpoint & proxy strategy</p>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-cyan-400 transition-transform duration-300 ${isNetworkOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        {isNetworkOpen && (
          <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-white/5 animate-in fade-in duration-200">
            {(Object.keys(NETWORK_MODES) as NetworkMode[]).map((key) => {
              const info = NETWORK_MODES[key];
              const isSelected = networkMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectMode(key)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 active:scale-[0.99] ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-[#1C182B]/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                      {info.label}
                    </span>
                    {isSelected && <Check size={14} className="text-cyan-400" />}
                  </div>
                  <span className="text-[10px] text-[#8F8A9F]">{info.description}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. App Update Check */}
      <button
        onClick={handleCheckUpdate}
        disabled={isCheckingUpdate}
        className="w-full p-4 rounded-2xl bg-[#151221]/80 hover:bg-[#1A162B] border border-white/10 flex items-center justify-between active:scale-[0.99] transition-all disabled:opacity-50 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <RotateCw size={20} className={isCheckingUpdate ? 'animate-spin' : ''} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Check for App Updates</h3>
            <p className="text-[11px] text-[#8F8A9F]">Verify latest version & service workers</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-purple-400">
          {isCheckingUpdate ? 'Checking...' : 'Check'}
        </span>
      </button>

      {/* 3. Admin Splash Screen Button */}
      <button
        onClick={onOpenAdminGate}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 hover:from-purple-900/40 hover:to-pink-900/40 border border-purple-500/30 flex items-center justify-between active:scale-[0.99] transition-all text-left mt-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Splash Background (Admin)</h3>
            <p className="text-[11px] text-[#8F8A9F]">Password & key protected photo upload</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">
          Unlock
        </span>
      </button>

      {/* 4. Cookie Sync Accordion */}
      <div className="w-full mt-1 rounded-2xl bg-[#151221]/80 border border-white/10 transition-all text-left overflow-hidden">
        <button
          type="button"
          onClick={() => setIsCookieSyncOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A162B]/50 transition-colors active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Sync YouTube Cookies</h3>
              <p className="text-[11px] text-[#8F8A9F]">Update server session without restarting</p>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-purple-400 transition-transform duration-300 ${isCookieSyncOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        {isCookieSyncOpen && (
          <div className="px-4 pb-4 pt-1 flex flex-col gap-3.5 border-t border-white/5 animate-in fade-in duration-200">
            <div className="flex p-1 bg-[#1A162B] rounded-xl border border-white/5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => { setCookieMode('file'); setCookieStatus({ type: 'idle', message: '' }); }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  cookieMode === 'file' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold' : 'text-[#8F8A9F] hover:text-white'
                }`}
              >
                <Upload size={12} />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => { setCookieMode('text'); setCookieStatus({ type: 'idle', message: '' }); }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  cookieMode === 'text' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold' : 'text-[#8F8A9F] hover:text-white'
                }`}
              >
                <FileText size={12} />
                <span>Paste Text</span>
              </button>
            </div>

            {cookieMode === 'file' ? (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="cookie-file-input"
                  className="w-full py-3 px-4 rounded-xl bg-[#1C182B] border border-dashed border-white/15 hover:border-purple-500/50 flex items-center justify-center gap-2 cursor-pointer transition-all text-xs text-[#8F8A9F] hover:text-white"
                >
                  <Upload size={14} className="text-purple-400" />
                  <span className="truncate max-w-[200px]">{selectedFile ? selectedFile.name : 'Select cookies.txt file'}</span>
                </label>
                <input
                  id="cookie-file-input"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setSelectedFile(file); setCookieStatus({ type: 'idle', message: '' }); }
                  }}
                />
              </div>
            ) : (
              <textarea
                rows={3}
                value={cookieText}
                onChange={(e) => { setCookieText(e.target.value); setCookieStatus({ type: 'idle', message: '' }); }}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com..."
                className="w-full bg-[#1C182B] text-white placeholder-[#686278] p-3 rounded-xl border border-white/10 focus:border-purple-500/60 focus:outline-none text-xs font-mono transition-all resize-none"
              />
            )}

            {cookieStatus.type === 'success' && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-[11px] flex items-center gap-1.5">
                <Check size={14} className="shrink-0" />
                <span>{cookieStatus.message}</span>
              </div>
            )}

            {cookieStatus.type === 'error' && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{cookieStatus.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncCookies}
              disabled={isSyncingCookies || (cookieMode === 'file' ? !selectedFile : !cookieText.trim())}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSyncingCookies ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Syncing to Server...</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  <span>Update Server Cookies</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};