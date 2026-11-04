import React from 'react';
import { motion, useTransform } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function HeroSection({ scrollYProgress }) {
  // Fade up and scale down slightly as user scrolls past
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

  return (
    <motion.div 
      style={{ opacity, scale, y }}
      className="flex flex-col items-center text-center max-w-3xl"
    >
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="font-inter font-semibold text-purple-400 tracking-[0.15em] uppercase text-xs mb-6"
      >
        Private Session Initialization
      </motion.p>
      
      <motion.h1 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
        className="font-manrope font-bold text-5xl md:text-7xl mb-6 tracking-tight text-[#e5e2e1] leading-tight"
      >
        Here's what your money says about you.
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
        className="font-inter text-[#988ca0] text-lg md:text-xl mb-12 max-w-xl mx-auto"
      >
        Private. Secure. Completely under your control.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="flex items-center gap-2 text-[#4c4354] font-inter text-sm bg-[#1a1a1a]/40 border border-white/5 backdrop-blur-md px-4 py-2 rounded-full"
      >
        <Lock size={14} className="text-purple-400/70" />
        Your data never leaves your device.
      </motion.div>
    </motion.div>
  );
}
