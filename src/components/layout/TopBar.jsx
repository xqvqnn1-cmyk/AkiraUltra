import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function TopBar() {
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search systems..." 
            className="pl-10 bg-secondary/50 border-border/50 font-mono text-sm focus:border-primary/50 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-primary/70 hidden sm:block">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>

        <button className="relative p-2 rounded hover:bg-secondary/50 transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse-glow" />
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-border/50">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-primary/30 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-body text-sm font-medium hidden md:block">
            {user?.full_name || 'Operator'}
          </span>
        </div>
      </div>
    </header>
  );
}