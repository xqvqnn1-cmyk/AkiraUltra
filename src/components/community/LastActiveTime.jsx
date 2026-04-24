import { formatDistanceToNow } from 'date-fns';

export default function LastActiveTime({ lastActive, status }) {
  if (!lastActive) return null;
  
  const time = formatDistanceToNow(new Date(lastActive), { addSuffix: true });
  
  if (status === 'online' || status === 'watching') {
    return <span className="text-[10px] text-green-400">{time}</span>;
  }
  
  return <span className="text-[10px] text-gray-500">{time}</span>;
}