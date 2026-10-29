"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Noto_Sans_Devanagari } from "next/font/google";

const devanagariFont = Noto_Sans_Devanagari({
  weight: ["600", "700"],
  subsets: ["devanagari", "latin"],
});

interface BrandEntranceProps {
  onFadeStart?: () => void;
  onComplete?: () => void;
}

export default function BrandEntrance({ onFadeStart, onComplete }: BrandEntranceProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Total animation runtime before beginning exit fade
    const timer = setTimeout(() => {
      onFadeStart?.();
      setVisible(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, [onFadeStart]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="brand-entrance"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.8, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#181612] overflow-hidden"
        >
          {/* Ambient warm glow in backdrop */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.35, 0.25] }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="absolute w-[600px] h-[400px] bg-gradient-to-r from-orange-600/30 via-amber-500/20 to-orange-700/20 rounded-full blur-[110px] pointer-events-none"
          />

          {/* Golden fine thread/flair line at top */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.6 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="w-32 h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent mb-6"
          />

          {/* SVG Animated Calligraphic Stroke */}
          <div className="relative flex items-center justify-center px-4">
            <svg
              viewBox="0 0 680 140"
              className="w-[280px] sm:w-[460px] md:w-[580px] h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="goldOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fdba74" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>

                <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Stroke path drawing simulation */}
              <motion.text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="none"
                stroke="url(#goldOrangeGrad)"
                strokeWidth="2.4"
                strokeDasharray="1200"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#subtleGlow)"
                style={{
                  fontFamily: devanagariFont.style.fontFamily,
                  fontSize: "92px",
                  fontWeight: 600,
                  letterSpacing: "4px",
                }}
                initial={{ strokeDashoffset: 1200, opacity: 0 }}
                animate={{ strokeDashoffset: 0, opacity: 1 }}
                transition={{
                  strokeDashoffset: { duration: 1.7, ease: [0.65, 0, 0.35, 1] },
                  opacity: { duration: 0.3 },
                }}
              >
                <tspan fontFamily="Playfair Display, Georgia, serif">Dar</tspan>
                <tspan fontFamily={devanagariFont.style.fontFamily}>ज़</tspan>
                <tspan fontFamily="Playfair Display, Georgia, serif">aani</tspan>
              </motion.text>

              {/* Rich fill revealing gracefully after stroke completes */}
              <motion.text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="url(#goldOrangeGrad)"
                style={{
                  fontSize: "92px",
                  fontWeight: 600,
                  letterSpacing: "4px",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.7, ease: "easeOut" }}
              >
                <tspan fontFamily="Playfair Display, Georgia, serif">Dar</tspan>
                <tspan fontFamily={devanagariFont.style.fontFamily}>ज़</tspan>
                <tspan fontFamily="Playfair Display, Georgia, serif">aani</tspan>
              </motion.text>
            </svg>
          </div>

          {/* Subtitle / Luxury Craftsmanship Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-3 mt-4"
          >
            <span className="h-[1px] w-6 sm:w-10 bg-orange-400/40" />
            <span className="text-[10px] sm:text-xs text-orange-200/70 tracking-[0.35em] uppercase font-light">
              Bespoke Haute Couture & Tailoring
            </span>
            <span className="h-[1px] w-6 sm:w-10 bg-orange-400/40" />
          </motion.div>

          {/* Golden bottom accent line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.4 }}
            transition={{ delay: 0.4, duration: 1.2, ease: "easeInOut" }}
            className="w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mt-6"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
