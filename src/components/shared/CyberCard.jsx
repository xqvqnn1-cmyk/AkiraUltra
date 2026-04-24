import React from 'react';
import { motion } from 'framer-motion';

export default function CyberCard({ children, className = '', glowColor = 'cyan', delay = 0, onClick }) {
  const glowClass = {
    cyan: 'hover:neon-glow-cyan border-primary/10 hover:border-primary/30',
    magenta: 'hover:neon-glow-magenta border-accent/10 hover:border-accent/30',
    purple: 'hover:neon-glow-purple border-neon-purple/10 hover:border-neon-purple/30',
  }[glowColor] || 'hover:neon-glow-cyan border-primary/10 hover:border-primary/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      onClick={onClick}
      className={`bg-card/80 backdrop-blur-sm border rounded transition-all duration-300 ${glowClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}