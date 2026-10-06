import React, { useState } from 'react';
import { Clipboard, Download, Loader2, Link2, Sparkles, AlertCircle } from 'lucide-react';
import { fetchVideoInfo, downloadAudioStream, type ProgressCallbackData } from '../services/api';
import type { VideoInfo, Track } from '../types';

interface ConverterTabProps {
  onTrackSaved: (track: Track) => Promise<void>;
}

export const ConverterTab: React.FC<ConverterTabProps> = ({ onTrackSaved }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ProgressCallbackData | null>(null);
  const [preview, setPreview] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Paste from iPhone / desktop clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setError(null);
      }
    } catch {
      setError('Clipboard permission denied. Please paste manually.');
    }
  };

  // Fetch track preview from NestJS backend
  const handleFetchInfo = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const info = await fetchVideoInfo(url.trim());
      setPreview(info);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch video information';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Download & save offline track with 3x retry
  const handleDownload = async () => {
    if (!url.trim()) return;
    setDownloading(true);
    setDownloadProgress({
      percent: 0,
      receivedBytes: 0,
      totalBytes: 0,
      statusText: 'Connecting to NestJS audio stream...',
    });
    setError(null);

    try {
      const track = await downloadAudioStream(
        url.trim(),
        preview,
        (progressData) => {
          setDownloadProgress(progressData);
        },
        3,
        2000
      );

      await onTrackSaved(track);
      setUrl('');
      setPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setError(msg);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto w-full select-none">
      {/* Card Wrapper */}
      <div className="p-5 rounded-3xl bg-[#151221]/80 border border-white/10 backdrop-blur-2xl shadow-xl">
        <h2 className="text-xl font-bold text-white mb-3">Convert & Store Offline</h2>

        {/* URL Input Box */}
        <div className="relative flex items-center mb-2">
          <div className="absolute left-3.5 text-[#8F8A9F] pointer-events-none">
            <Link2 size={18} />
          </div>

          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="Paste YouTube or Music URL..."
            className="w-full bg-[#1C182B] text-white placeholder-[#686278] pl-10 pr-20 py-3 rounded-2xl border border-white/10 focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-medium transition-all shadow-inner"
          />

          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-purple-300 flex items-center gap-1 active:scale-95 transition-all"
          >
            <Clipboard size={12} />
            <span>Paste</span>
          </button>
        </div>

        {/* Action Button: Preview or Fetch */}
        {!preview && (
          <button
            onClick={handleFetchInfo}
            disabled={loading || !url.trim()}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Fetching Track Details...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Fetch Track Preview</span>
              </>
            )}
          </button>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Video Preview & Download Action Card */}
      {preview && (
        <div className="p-4 rounded-3xl bg-[#1A162D]/90 border border-purple-500/30 backdrop-blur-2xl shadow-[0_10px_35px_rgba(147,51,234,0.15)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-3.5 items-center mb-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#241E38] shrink-0 border border-white/10 shadow">
              <img src={preview.thumbnail} alt={preview.title} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate leading-tight">{preview.title}</h3>
              <p className="text-xs text-[#8F8A9F] mt-1 truncate">{preview.channel}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {preview.durationFormatted}
                </span>
                <span className="text-[11px] text-[#686278]">High Quality MP3</span>
              </div>
            </div>
          </div>

          {/* Progress Bar (Supports percentage and indeterminate streams) */}
          {downloading && downloadProgress && (
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs text-purple-300 mb-1.5 font-medium">
                <span className="truncate pr-2">{downloadProgress.statusText}</span>
                {downloadProgress.percent >= 0 && (
                  <span className="shrink-0 font-mono font-bold">{downloadProgress.percent}%</span>
                )}
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                {downloadProgress.percent >= 0 ? (
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                ) : (
                  <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          )}

          {/* Download & Save Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Storing Offline in IndexedDB...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Save Offline to Library</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};