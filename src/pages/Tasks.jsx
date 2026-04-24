import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectionHeader from '../components/shared/SectionHeader';
import TaskItem from '../components/tasks/TaskItem';
import TaskForm from '../components/tasks/TaskForm';
import { AnimatePresence, motion } from 'framer-motion';

export default function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = (task, newStatus) => {
    updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionHeader
        title="TASK QUEUE"
        subtitle="Manage and track all tasks"
        action={
          <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="font-mono text-xs tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 neon-glow-magenta gap-2">
            <Plus className="w-4 h-4" /> NEW TASK
          </Button>
        }
      />

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <TaskForm
              task={editing}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="all" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">All</TabsTrigger>
          <TabsTrigger value="pending" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Pending</TabsTrigger>
          <TabsTrigger value="in_progress" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">In Progress</TabsTrigger>
          <TabsTrigger value="review" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Review</TabsTrigger>
          <TabsTrigger value="completed" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.map((task, i) => (
          <TaskItem
            key={task.id}
            task={task}
            delay={i}
            onEdit={(t) => { setEditing(t); setShowForm(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onStatusChange={handleStatusChange}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-mono text-sm">No tasks in queue</p>
          </div>
        )}
      </div>
    </div>
  );
}