import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, Repeat, MessageCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface NotificationActor {
  display_name: string;
  handle: string;
  avatar_url?: string;
}

interface NotificationItem {
  id: string;
  type: 'like' | 'repost' | 'reply' | 'follow';
  targetId: string;
  actors: NotificationActor[];
  additionalActorsCount: number;
  totalEvents: number;
  isRead: boolean;
  timestamp: number;
}

export function DreamXNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/dreamx/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch('/api/dreamx/notifications/mark-read', { method: 'POST' });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markAsRead();
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'repost': return <Repeat className="w-4 h-4 text-green-500" />;
      case 'reply': return <MessageCircle className="w-4 h-4 text-blue-500 fill-blue-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const formatActors = (notif: NotificationItem) => {
    const names = notif.actors.map(a => a.display_name);
    if (notif.additionalActorsCount > 0) {
      if (names.length === 1) return `${names[0]} and ${notif.additionalActorsCount} others`;
      if (names.length === 2) return `${names[0]}, ${names[1]}, and ${notif.additionalActorsCount} others`;
      return `${names[0]}, ${names[1]}, and ${notif.additionalActorsCount + 1} others`;
    }
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]}, and ${names[2]}`;
  };

  const formatAction = (type: string) => {
    switch (type) {
      case 'like': return 'liked your post';
      case 'repost': return 'reposted your post';
      case 'reply': return 'replied to your post';
      case 'follow': return 'followed you';
      default: return 'interacted with you';
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Math.max(0, Date.now() - ts);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    return `${Math.floor(diff/86400000)}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#090a0f]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col">
          <div className="p-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1a1b26]/95 backdrop-blur-sm z-10">
            <h3 className="font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAsRead} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map(notif => (
                <Link 
                  href={notif.type === 'follow' ? `/dreamx/profile/${encodeURIComponent(notif.targetId)}` : `/dreamx/post/${encodeURIComponent(notif.targetId)}`} 
                  key={notif.id}
                  className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 ${!notif.isRead ? 'bg-blue-500/5' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex-shrink-0 pt-1 w-6 flex justify-end">
                    {renderIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {notif.actors.map((actor, idx) => (
                        <div key={idx} className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                          {actor.avatar_url ? (
                            <img src={actor.avatar_url} alt={actor.handle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/60 uppercase">
                              {actor.display_name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-white/90 leading-tight">
                      <span className="font-bold">{formatActors(notif)}</span> {formatAction(notif.type)}
                      {notif.totalEvents > 1 && notif.type !== 'follow' && (
                         <span className="ml-1 text-white/50 text-xs">({notif.totalEvents}x)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-white/40 whitespace-nowrap">
                    {timeAgo(notif.timestamp)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
