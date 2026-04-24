import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import CyberCard from '../shared/CyberCard';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-primary/20 rounded px-3 py-1.5 neon-glow-cyan">
        <p className="text-xs font-mono text-primary">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function MiniChart({ title, data, dataKey, color = '#00f0ff' }) {
  return (
    <CyberCard className="p-4">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${dataKey})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CyberCard>
  );
}