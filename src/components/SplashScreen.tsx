import React, { useEffect, useState } from 'react';
import { MUSIC_QUOTES } from '../utils/user';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
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
      className={`fixed inset-0 z-50 bg-[#06040A] select-none overflow-hidden transition-all duration-700 ease-in-out ${
        isShattering
          ? 'opacity-0 backdrop-blur-3xl pointer-events-none scale-105'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. AMBIENT BACKGROUND LAYER (Sonic Rings & Lighting) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full border border-red-500/10 animate-ping [animation-duration:4s]" />
        <div className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-purple-500/10 animate-pulse [animation-duration:3s]" />
        <div className="absolute w-[520px] h-[520px] rounded-full border border-white/[0.03]" />
      </div>

      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-1000 ease-out ${
          isShattering
            ? 'w-[750px] h-[750px] bg-red-600/40 blur-[150px]'
            : 'w-80 h-80 bg-red-600/25 blur-[120px]'
        }`}
      />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 blur-[130px] pointer-events-none" />

      {/* 2. TOP STUDIO HEADER (Independent Layer) */}
      {/* <div className="absolute top-8 left-0 right-0 px-6 z-10 flex items-center justify-between max-w-sm mx-auto opacity-60">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#A6A0B8]">Original Sound</span>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-[#7C7593]">24-BIT HI-RES</span>
      </div> */}

      {/* 3. CENTER HERO: "LAVI CREATION" (Locked Dead-Center, Untouchable) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center w-full px-4 pointer-events-none">
        {/* LAVI Letters */}
        <div className="flex items-center gap-2 mb-3">
          {laviConfig.map(({ char, scatter }, i) => (
            <span
              key={i}
              className={`inline-block text-5xl sm:text-6xl font-black tracking-wider text-red-600 drop-shadow-[0_0_35px_rgba(220,38,38,0.75)] transition-all duration-700 ease-out ${
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

        {/* CREATION Glass Pill */}
        <div
          className={`relative px-6 py-2 rounded-full bg-white/[0.05] border border-white/20 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden transition-all duration-500 ease-out ${
            isShattering
              ? 'scale-125 opacity-0 blur-lg border-white/50'
              : 'animate-in fade-in zoom-in-75 duration-700 fill-mode-both'
          }`}
          style={{ animationDelay: '500ms' }}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="flex items-center tracking-[0.38em] text-[11px] sm:text-xs font-bold text-white/95 uppercase pl-[0.38em]">
            {creationLetters.map((char, idx) => (
              <span
                key={idx}
                className="inline-block animate-in fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${550 + idx * 35}ms` }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Active Mini Spectrum Equalizer */}
        <div className="flex items-center gap-1 mt-6 opacity-75">
          <span className="w-1.5 h-3 rounded-full bg-red-500/80 animate-pulse [animation-duration:1s]" />
          <span className="w-1.5 h-5 rounded-full bg-purple-500/80 animate-pulse [animation-duration:1.4s]" />
          <span className="w-1.5 h-7 rounded-full bg-pink-500 animate-pulse [animation-duration:0.9s]" />
          <span className="w-1.5 h-4 rounded-full bg-purple-500/80 animate-pulse [animation-duration:1.2s]" />
          <span className="w-1.5 h-2 rounded-full bg-red-500/80 animate-pulse [animation-duration:0.8s]" />
        </div>
      </div>

      {/* 4. INDEPENDENT QUOTE LAYER (Move or redesign freely via bottom / top coordinates) */}
      <div
        className={`absolute bottom-8 left-0 right-0 px-6 z-30 transition-all duration-700 ease-out transform ${
          stage === 'showQuote'
            ? 'opacity-100 translate-y-0 scale-100'
            : isShattering
            ? 'opacity-0 translate-y-8 scale-95 blur-sm'
            : 'opacity-0 translate-y-12 scale-95'
        }`}
      >
        <div className="w-full max-w-sm mx-auto mb-[6%]">
          {/* --- YOU CAN FREELY EDIT OR REPLACE EVERYTHING INSIDE THIS CONTAINER --- */}
          <div className="relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

            <span className="absolute -top-3 left-4 text-6xl font-serif text-white/5 pointer-events-none select-none">
              “
            </span>

            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-medium text-white/90 italic leading-relaxed tracking-wide text-center">
                "{quote.text}"
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#B5AFCE]">
                    {quote.author}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-70">
                  <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse [animation-duration:0.7s]" />
                  <span className="w-0.5 h-3.5 bg-pink-400 rounded-full animate-pulse [animation-duration:1.1s]" />
                  <span className="w-0.5 h-2.5 bg-red-400 rounded-full animate-pulse [animation-duration:0.9s]" />
                  <span className="w-0.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-duration:1.3s]" />
                </div>
              </div>
            </div>
          </div>
          {/* --- END QUOTE CONTAINER --- */}
        </div>
      </div>
    </div>
  );
};