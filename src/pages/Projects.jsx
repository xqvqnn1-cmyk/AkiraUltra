import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectionHeader from '../components/shared/SectionHeader';
import ProjectList from '../components/projects/ProjectList';
import ProjectForm from '../components/projects/ProjectForm';
import { AnimatePresence, motion } from 'framer-motion';

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (project) => {
    setEditing(project);
    setShowForm(true);
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="PROJECTS"
        subtitle="Manage your project portfolio"
        action={
          <Button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="font-mono text-xs tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-cyan gap-2">
            <Plus className="w-4 h-4" /> NEW PROJECT
          </Button>
        }
      />

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <ProjectForm
              project={editing}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="all" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">All</TabsTrigger>
          <TabsTrigger value="active" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Active</TabsTrigger>
          <TabsTrigger value="completed" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Completed</TabsTrigger>
          <TabsTrigger value="on_hold" className="font-mono text-xs tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">On Hold</TabsTrigger>
        </TabsList>
      </Tabs>

      <ProjectList projects={filtered} onSelect={handleEdit} />
    </div>
  );
}