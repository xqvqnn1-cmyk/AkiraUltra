import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import CyberCard from '../shared/CyberCard';

export default function TaskForm({ task, onSubmit, onCancel }) {
  const [form, setForm] = useState(task || {
    title: '', description: '', status: 'pending', priority: 'medium', due_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <CyberCard className="p-6" glowColor="magenta">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-sm font-bold tracking-wider text-accent">
          {task ? 'EDIT TASK' : 'NEW TASK'}
        </h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Title</Label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 bg-secondary/50 border-border/50 font-body" required />
        </div>

        <div>
          <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Description</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 bg-secondary/50 border-border/50 font-body h-20" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1 bg-secondary/50 border-border/50 font-mono" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="font-mono text-xs tracking-wider border-border/50">CANCEL</Button>
          <Button type="submit" className="font-mono text-xs tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 neon-glow-magenta">{task ? 'UPDATE' : 'CREATE'}</Button>
        </div>
      </form>
    </CyberCard>
  );
}