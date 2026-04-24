import React from 'react';

export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-heading text-lg md:text-xl font-bold tracking-wider">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground font-body mt-0.5">{subtitle}</p>}
      </div>
      {action && action}
    </div>
  );
}