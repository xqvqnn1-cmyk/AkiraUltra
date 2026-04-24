import React from 'react';

export default function ProgressBar({ value = 0, className = '' }) {
  return (
    <div className={`w-full h-1.5 bg-secondary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-primary via-neon-purple to-accent rounded-full transition-all duration-500 relative"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-white/20" />
      </div>
    </div>
  );
}