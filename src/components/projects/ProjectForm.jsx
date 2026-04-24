import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import CyberCard from '../shared/CyberCard';

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const [form, setForm] = useState(project || {
    title: '', description: '', status: 'active', priority: 'medium', category: 'development', progress: 0, due_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, progress: Number(form.progress) });
  };

  return (
    <CyberCard className="p-6" glowColor="cyan">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-sm font-bold tracking-wider text-primary">
          {project ? 'EDIT PROJECT' : 'NEW PROJECT'}
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
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Progress (%)</Label>
            <Input type="number" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} className="mt-1 bg-secondary/50 border-border/50 font-mono" />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1 bg-secondary/50 border-border/50 font-mono" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="font-mono text-xs tracking-wider border-border/50">CANCEL</Button>
          <Button type="submit" className="font-mono text-xs tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-cyan">{project ? 'UPDATE' : 'CREATE'}</Button>
        </div>
      </form>
    </CyberCard>
  );
}