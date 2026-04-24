import React from 'react';

const statusStyles = {
  active: 'bg-neon-green/10 text-neon-green border-neon-green/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
  archived: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20',
  on_hold: 'bg-accent/10 text-accent border-accent/20',
  pending: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  review: 'bg-neon-purple/10 text-neon-purple border-neon-purple/20',
  low: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20',
  medium: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  high: 'bg-accent/10 text-accent border-accent/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border rounded ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse-glow" />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}