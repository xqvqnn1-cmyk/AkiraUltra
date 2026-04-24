import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';
import CyberCard from '../components/shared/CyberCard';
import SectionHeader from '../components/shared/SectionHeader';

const COLORS = ['#00f0ff', '#ff00aa', '#8b5cf6', '#22c55e', '#eab308'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-primary/20 rounded px-3 py-2 neon-glow-cyan">
        <p className="text-xs font-mono text-muted-foreground">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-mono" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
    initialData: [],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    initialData: [],
  });

  // Task status distribution
  const taskStatusData = ['pending', 'in_progress', 'review', 'completed'].map(status => ({
    name: status.replace(/_/g, ' '),
    value: tasks.filter(t => t.status === status).length,
  }));

  // Project category distribution
  const categoryData = ['development', 'design', 'research', 'marketing', 'operations'].map(cat => ({
    name: cat,
    value: projects.filter(p => p.category === cat).length,
  })).filter(d => d.value > 0);

  // Priority distribution
  const priorityData = ['low', 'medium', 'high', 'critical'].map(p => ({
    name: p,
    tasks: tasks.filter(t => t.priority === p).length,
    projects: projects.filter(pr => pr.priority === p).length,
  }));

  // Progress radial
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;

  const radialData = [{ name: 'Progress', value: avgProgress, fill: '#00f0ff' }];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <SectionHeader title="ANALYTICS" subtitle="System performance metrics" />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-primary' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'text-neon-green' },
          { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, color: 'text-accent' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: 'text-neon-purple' },
        ].map((stat, i) => (
          <CyberCard key={i} delay={i} className="p-4 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-heading font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </CyberCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CyberCard className="p-6" glowColor="cyan">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Task Status Distribution</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="font-mono text-xs text-muted-foreground capitalize">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        <CyberCard className="p-6" glowColor="magenta">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Priority Breakdown</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 16%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(240 10% 55%)', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                <YAxis tick={{ fill: 'hsl(240 10% 55%)', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasks" fill="#00f0ff" radius={[2, 2, 0, 0]} name="Tasks" />
                <Bar dataKey="projects" fill="#ff00aa" radius={[2, 2, 0, 0]} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        <CyberCard className="p-6" glowColor="purple">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Average Project Progress</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'hsl(240 15% 12%)' }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="font-heading" fill="#00f0ff" fontSize="28" fontWeight="bold">
                  {avgProgress}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        {categoryData.length > 0 && (
          <CyberCard className="p-6" glowColor="cyan">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Projects by Category</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 16%)" />
                  <XAxis type="number" tick={{ fill: 'hsl(240 10% 55%)', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(240 10% 55%)', fontSize: 11, fontFamily: 'Share Tech Mono' }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 2, 2, 0]} name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CyberCard>
        )}
      </div>
    </div>
  );
}