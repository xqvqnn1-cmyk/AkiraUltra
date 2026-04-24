import React from 'react';
import CyberCard from './CyberCard';

export default function StatCard({ title, value, subtitle, icon: Icon, glowColor = 'cyan', delay = 0 }) {
  const iconColorClass = {
    cyan: 'text-primary',
    magenta: 'text-accent',
    purple: 'text-neon-purple',
  }[glowColor] || 'text-primary';

  const bgClass = {
    cyan: 'bg-primary/5',
    magenta: 'bg-accent/5',
    purple: 'bg-neon-purple/5',
  }[glowColor] || 'bg-primary/5';

  return (
    <CyberCard glowColor={glowColor} delay={delay} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
          <p className="text-2xl md:text-3xl font-heading font-bold tracking-wider">{value}</p>
          {subtitle && (
            <p className="text-xs font-body text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded ${bgClass}`}>
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
      </div>
    </CyberCard>
  );
}