import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, User, Bell, Shield } from 'lucide-react';
import CyberCard from '../components/shared/CyberCard';
import SectionHeader from '../components/shared/SectionHeader';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    sound_effects: false,
    compact_mode: false,
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.notifications !== undefined) setSettings(prev => ({ ...prev, notifications: u.notifications }));
      if (u?.sound_effects !== undefined) setSettings(prev => ({ ...prev, sound_effects: u.sound_effects }));
      if (u?.compact_mode !== undefined) setSettings(prev => ({ ...prev, compact_mode: u.compact_mode }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await base44.auth.updateMe(settings);
    toast.success('Settings updated');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <SectionHeader title="SETTINGS" subtitle="System configuration" />

      {/* Profile Section */}
      <CyberCard className="p-6" glowColor="cyan">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded bg-primary/10">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-heading text-sm font-bold tracking-wider">PROFILE</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Name</Label>
            <Input value={user?.full_name || ''} disabled className="mt-1 bg-secondary/50 border-border/50 font-body opacity-60" />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Email</Label>
            <Input value={user?.email || ''} disabled className="mt-1 bg-secondary/50 border-border/50 font-mono opacity-60" />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Role</Label>
            <Input value={user?.role || 'user'} disabled className="mt-1 bg-secondary/50 border-border/50 font-mono opacity-60 uppercase" />
          </div>
        </div>
      </CyberCard>

      {/* Preferences */}
      <CyberCard className="p-6" glowColor="purple">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded bg-neon-purple/10">
            <Bell className="w-4 h-4 text-neon-purple" />
          </div>
          <h3 className="font-heading text-sm font-bold tracking-wider">PREFERENCES</h3>
        </div>

        <div className="space-y-5">
          {[
            { key: 'notifications', label: 'Notifications', desc: 'Enable system notifications' },
            { key: 'sound_effects', label: 'Sound Effects', desc: 'Play sounds for actions' },
            { key: 'compact_mode', label: 'Compact Mode', desc: 'Reduce spacing in UI elements' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={v => setSettings(prev => ({ ...prev, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </CyberCard>

      {/* System Info */}
      <CyberCard className="p-6" glowColor="magenta">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded bg-accent/10">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-heading text-sm font-bold tracking-wider">SYSTEM</h3>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Version', value: 'AKIRA+ v2.0.4' },
            { label: 'Build', value: 'Cyberpunk Edition' },
            { label: 'Status', value: 'ONLINE' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{item.label}</span>
              <span className="text-xs font-mono text-primary">{item.value}</span>
            </div>
          ))}
        </div>
      </CyberCard>

      <Button onClick={handleSave} className="w-full font-mono text-xs tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-cyan gap-2">
        <Save className="w-4 h-4" /> SAVE CONFIGURATION
      </Button>
    </div>
  );
}