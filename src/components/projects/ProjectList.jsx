import React from 'react';
import CyberCard from '../shared/CyberCard';
import StatusBadge from '../shared/StatusBadge';
import ProgressBar from '../shared/ProgressBar';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function ProjectList({ projects = [], compact = false, onSelect }) {
  if (projects.length === 0) {
    return (
      <CyberCard className="p-8 text-center">
        <p className="text-muted-foreground font-mono text-sm">No projects found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Create your first project to get started</p>
      </CyberCard>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project, i) => (
        <CyberCard
          key={project.id}
          delay={i}
          glowColor={i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'magenta' : 'purple'}
          onClick={() => onSelect?.(project)}
          className="p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-body text-sm font-semibold tracking-wide truncate">{project.title}</h3>
              {!compact && project.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            <StatusBadge status={project.status} />
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex-1">
              <ProgressBar value={project.progress || 0} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{project.progress || 0}%</span>
          </div>

          {!compact && project.due_date && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="font-mono">{format(new Date(project.due_date), 'MMM dd, yyyy')}</span>
            </div>
          )}
        </CyberCard>
      ))}
    </div>
  );
}