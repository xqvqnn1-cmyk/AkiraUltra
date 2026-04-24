import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, FolderPlus, Zap, Target, RefreshCw } from 'lucide-react';
import CyberCard from '../shared/CyberCard';

const typeIcons = {
  task_completed: CheckCircle,
  task_created: Zap,
  project_created: FolderPlus,
  project_updated: RefreshCw,
  milestone_reached: Target,
};

const typeColors = {
  task_completed: 'text-neon-green',
  task_created: 'text-primary',
  project_created: 'text-neon-purple',
  project_updated: 'text-accent',
  milestone_reached: 'text-chart-5',
};

export default function ActivityFeed({ activities = [] }) {
  if (activities.length === 0) {
    return (
      <CyberCard className="p-6 text-center">
        <p className="text-muted-foreground font-mono text-sm">No recent activity</p>
      </CyberCard>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 8).map((activity, i) => {
        const Icon = typeIcons[activity.type] || Zap;
        const colorClass = typeColors[activity.type] || 'text-primary';
        return (
          <CyberCard key={activity.id} delay={i} className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded bg-secondary/50">
              <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-medium truncate">{activity.title}</p>
              {activity.description && (
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              )}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
              {format(new Date(activity.created_date), 'HH:mm')}
            </span>
          </CyberCard>
        );
      })}
    </div>
  );
}