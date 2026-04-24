import React from 'react';
import CyberCard from '../shared/CyberCard';
import StatusBadge from '../shared/StatusBadge';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskItem({ task, onEdit, onDelete, onStatusChange, delay = 0 }) {
  const nextStatus = {
    pending: 'in_progress',
    in_progress: 'review',
    review: 'completed',
    completed: 'pending',
  };

  return (
    <CyberCard delay={delay} glowColor={task.priority === 'critical' ? 'magenta' : task.priority === 'high' ? 'purple' : 'cyan'} className="p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task, nextStatus[task.status] || 'pending')}
          className={`mt-0.5 w-4 h-4 rounded-sm border-2 flex-shrink-0 transition-all ${
            task.status === 'completed'
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 hover:border-primary'
          }`}
        >
          {task.status === 'completed' && (
            <svg className="w-full h-full text-primary-foreground" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h4 className={`font-body text-sm font-semibold tracking-wide ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={task.status} />
            <StatusBadge status={task.priority} />
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'MMM dd')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(task)} className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </CyberCard>
  );
}