import React, { useState } from 'react';
import { ZoomIn, MoveVertical, MoveHorizontal, Check, X, RotateCcw } from 'lucide-react';

export interface SplashConfig {
  image: string;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ImageAdjustModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (config: SplashConfig) => void;
}

export const ImageAdjustModal: React.FC<ImageAdjustModalProps> = ({
  imageSrc,
  onCancel,
  onConfirm,
}) => {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -50% to 50%
  const [offsetY, setOffsetY] = useState(0); // -50% to 50%

  const handleReset = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleApply = () => {
    onConfirm({
      image: imageSrc,
      scale,
      offsetX,
      offsetY,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#06040A]/95 backdrop-blur-2xl flex flex-col justify-between p-4 max-w-md mx-auto w-full select-none animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <h3 className="text-sm font-bold text-white">Adjust Splash Photo</h3>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 active:scale-95"
        >
          <X size={16} />
        </button>
      </div>

      {/* Frame Preview - Exactly what will render on the phone */}
      <div className="relative mx-auto w-[240px] h-[420px] rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-2xl bg-[#06040A] flex items-center justify-center">
        {/* Layer 1: Ambient Blurred Fill (No empty gaps) */}
        <img
          src={imageSrc}
          alt="Ambient Background"
          className="absolute inset-0 w-full h-full object-cover scale-125 filter blur-xl brightness-40 pointer-events-none"
        />

        {/* Layer 2: Full Original Photo (No Cropping, pure fit) */}
        <img
          src={imageSrc}
          alt="Uncropped Preview"
          style={{
            transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
          }}
          className="w-full h-full object-contain pointer-events-none transition-transform duration-75 relative z-0"
        />

        {/* Mock overlay guide */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase font-mono tracking-widest text-red-500/80 mb-1">
            LAVI CREATION
          </span>
          <div className="w-14 h-0.5 bg-red-500/40 rounded-full" />
        </div>
      </div>

      {/* Sliders & Controls */}
      <div className="p-4 rounded-3xl bg-[#171426] border border-white/10 flex flex-col gap-2.5 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8F8A9F]">Full Photo Positioning</span>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3">
          <ZoomIn size={16} className="text-purple-400 shrink-0" />
          <span className="text-xs text-[#8F8A9F] w-12">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-[11px] font-mono text-purple-300 w-8 text-right">
            {scale.toFixed(1)}x
          </span>
        </div>

        {/* Horizontal Pan X Slider */}
        <div className="flex items-center gap-3">
          <MoveHorizontal size={16} className="text-cyan-400 shrink-0" />
          <span className="text-xs text-[#8F8A9F] w-12">Pan X</span>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[11px] font-mono text-cyan-300 w-8 text-right">
            {offsetX}%
          </span>
        </div>

        {/* Vertical Pan Y Slider */}
        <div className="flex items-center gap-3">
          <MoveVertical size={16} className="text-pink-400 shrink-0" />
          <span className="text-xs text-[#8F8A9F] w-12">Pan Y</span>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <span className="text-[11px] font-mono text-pink-300 w-8 text-right">
            {offsetY}%
          </span>
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleApply}
          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all mt-1"
        >
          <Check size={16} />
          <span>Confirm & Save</span>
        </button>
      </div>
    </div>
  );
};