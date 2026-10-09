import React, { useEffect, useState } from 'react';
import { MUSIC_QUOTES } from '../utils/user';
import type { SplashConfig } from './ImageAdjustModal';

interface SplashScreenProps {
  onFinish: () => void;
  backgroundConfig?: SplashConfig | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, backgroundConfig }) => {
  const [stage, setStage] = useState<'intro' | 'showQuote' | 'shatter' | 'dissolved'>('intro');
  const [quote] = useState(() => {
    const idx = Math.floor(Math.random() * MUSIC_QUOTES.length);
    return MUSIC_QUOTES[idx];
  });

  useEffect(() => {
    const quoteTimer = setTimeout(() => {
      setStage('showQuote');
    }, 850);

    const shatterTimer = setTimeout(() => {
      setStage('shatter');
    }, 3100);

    const finishTimer = setTimeout(() => {
      setStage('dissolved');
      onFinish();
    }, 3900);

    return () => {
      clearTimeout(quoteTimer);
      clearTimeout(shatterTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const isShattering = stage === 'shatter' || stage === 'dissolved';

  const laviConfig = [
    { char: 'L', scatter: '-translate-x-20 -translate-y-16 -rotate-12 scale-125' },
    { char: 'A', scatter: '-translate-x-8 -translate-y-24 rotate-6 scale-135' },
    { char: 'V', scatter: 'translate-x-8 -translate-y-24 -rotate-6 scale-135' },
    { char: 'I', scatter: 'translate-x-20 -translate-y-16 rotate-12 scale-125' },
  ];

  const creationLetters = ['C', 'R', 'E', 'A', 'T', 'I', 'O', 'N'];

  return (
    <div
      className={`fixed inset-0 w-full h-[100dvh] max-w-md mx-auto z-50 select-none overflow-hidden transition-all duration-700 ease-in-out ${
        isShattering
          ? 'opacity-0 backdrop-blur-3xl pointer-events-none scale-105'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. DUAL-LAYER SEAMLESS BLEND BACKGROUND */}
      {backgroundConfig?.image ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#06040A]">
          {/* Layer 1: Ambient Blurred Base (Fills screen margins with genuine photo tones) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src={backgroundConfig.image}
              alt="Ambient Blurred Base"
              className="w-full h-full object-cover scale-125 filter blur-[52px] brightness-[0.32] contrast-125"
            />
          </div>

          {/* Layer 2: 100% Uncropped Photo with Custom Zoom & 2D Pan */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <img
              src={backgroundConfig.image}
              alt="Splash Photo"
              style={{
                transform: `translate(${backgroundConfig.offsetX}%, ${backgroundConfig.offsetY}%) scale(${backgroundConfig.scale})`,
              }}
              className="w-full h-full object-contain filter brightness-[0.55] contrast-110 drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            />
          </div>

          {/* Layer 3: Contrast & Vignette Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#06040A]/85 via-transparent to-[#06040A]/95 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[#06040A]/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#06040A]" />
      )}

      {/* 2. AMBIENT PULSING RINGS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        <div className="w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full border border-red-500/20 animate-ping [animation-duration:4s]" />
        <div className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-purple-500/20 animate-pulse [animation-duration:3s]" />
        <div className="absolute w-[520px] h-[520px] rounded-full border border-white/[0.04]" />
      </div>

      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[1] transition-all duration-1000 ease-out ${
          isShattering
            ? 'w-[750px] h-[750px] bg-red-600/40 blur-[150px]'
            : 'w-80 h-80 bg-red-600/30 blur-[120px]'
        }`}
      />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/25 blur-[130px] pointer-events-none z-[1]" />

      {/* 4. CENTER HERO: "LAVI CREATION" (3D Chiseled Bevel & Emboss) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center w-full px-4 pointer-events-none">

        {/* 3D Beveled LAVI Letters */}
        <div className="flex items-center gap-2 mb-3.5">
          {laviConfig.map(({ char, scatter }, i) => (
            <span
              key={i}
              className={`bevel-lavi inline-block text-5xl sm:text-6xl font-black tracking-wider transition-all duration-700 ease-out ${
                isShattering
                  ? `${scatter} opacity-0 blur-md`
                  : 'animate-in fade-in slide-in-from-top-24 duration-700 fill-mode-both'
              }`}
              style={{
                animationDelay: isShattering ? '0ms' : `${i * 110}ms`,
                animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* 3D Embossed CREATION Glass Pill */}
        <div
          className={`bevel-pill relative px-6 py-2 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-2xl flex items-center justify-center overflow-hidden transition-all duration-500 ease-out ${
            isShattering
              ? 'scale-125 opacity-0 blur-lg border-white/50'
              : 'animate-in fade-in zoom-in-75 duration-700 fill-mode-both'
          }`}
          style={{ animationDelay: '500ms' }}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="flex items-center tracking-[0.38em] text-[11px] sm:text-xs font-black uppercase pl-[0.38em]">
            {creationLetters.map((char, idx) => (
              <span
                key={idx}
                className="emboss-creation inline-block animate-in fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${550 + idx * 35}ms` }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Active Mini Spectrum Equalizer */}
        <div className="flex items-center gap-1 mt-6 opacity-85">
          <span className="w-1.5 h-3 rounded-full bg-red-500 animate-pulse [animation-duration:1s]" />
          <span className="w-1.5 h-5 rounded-full bg-purple-500 animate-pulse [animation-duration:1.4s]" />
          <span className="w-1.5 h-7 rounded-full bg-pink-500 animate-pulse [animation-duration:0.9s]" />
          <span className="w-1.5 h-4 rounded-full bg-purple-500 animate-pulse [animation-duration:1.2s]" />
          <span className="w-1.5 h-2 rounded-full bg-red-500 animate-pulse [animation-duration:0.8s]" />
        </div>
      </div>

      {/* 5. INDEPENDENT QUOTE LAYER */}
      <div
        className={`absolute bottom-8 left-0 right-0 px-6 z-30 transition-all duration-700 ease-out transform ${
          stage === 'showQuote'
            ? 'opacity-100 translate-y-0 scale-100'
            : isShattering
            ? 'opacity-0 translate-y-8 scale-95 blur-sm'
            : 'opacity-0 translate-y-12 scale-95'
        }`}
      >
        <div className="w-full max-w-sm mx-auto">
          <div className="relative rounded-3xl bg-black/40 border border-white/20 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/25 rounded-full blur-2xl pointer-events-none" />

            <span className="absolute -top-3 left-4 text-6xl font-serif text-white/10 pointer-events-none select-none">
              “
            </span>

            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-medium text-white italic leading-relaxed tracking-wide text-center">
                "{quote.text}"
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#B5AFCE]">
                    {quote.author}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-80">
                  <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse [animation-duration:0.7s]" />
                  <span className="w-0.5 h-3.5 bg-pink-400 rounded-full animate-pulse [animation-duration:1.1s]" />
                  <span className="w-0.5 h-2.5 bg-red-400 rounded-full animate-pulse [animation-duration:0.9s]" />
                  <span className="w-0.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-duration:1.3s]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;