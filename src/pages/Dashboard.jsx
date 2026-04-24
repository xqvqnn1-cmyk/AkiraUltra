import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, CheckSquare, Zap, TrendingUp } from 'lucide-react';
import StatCard from '../components/shared/StatCard';
import SectionHeader from '../components/shared/SectionHeader';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import MiniChart from '../components/dashboard/MiniChart';
import ProjectList from '../components/projects/ProjectList';

const mockChartData = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  tasks: Math.floor(Math.random() * 20) + 5,
  completed: Math.floor(Math.random() * 15) + 2,
}));

export default function Dashboard() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 50),
    initialData: [],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date', 20),
    initialData: [],
  });

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-wider neon-text-cyan">
          COMMAND CENTER
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">System overview and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={activeProjects} subtitle="Currently running" icon={FolderKanban} glowColor="cyan" delay={0} />
        <StatCard title="Total Tasks" value={tasks.length} subtitle="Across all projects" icon={CheckSquare} glowColor="magenta" delay={1} />
        <StatCard title="Completed" value={completedTasks} subtitle="Tasks finished" icon={Zap} glowColor="purple" delay={2} />
        <StatCard title="In Queue" value={pendingTasks} subtitle="Awaiting action" icon={TrendingUp} glowColor="cyan" delay={3} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniChart title="Task Flow" data={mockChartData} dataKey="tasks" color="#00f0ff" />
        <MiniChart title="Completion Rate" data={mockChartData} dataKey="completed" color="#ff00aa" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionHeader title="ACTIVE PROJECTS" subtitle="Currently in progress" />
          <ProjectList projects={projects.filter(p => p.status === 'active').slice(0, 5)} compact />
        </div>
        <div>
          <SectionHeader title="ACTIVITY LOG" subtitle="Recent events" />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}