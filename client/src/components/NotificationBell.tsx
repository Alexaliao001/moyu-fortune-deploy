import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Bell, Check, CheckCheck, MessageSquare, Gift, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type NotificationType = 'feedback_reply' | 'system' | 'reward';

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  feedback_reply: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500' },
  system: { icon: <Info className="w-4 h-4" />, color: 'text-gray-500' },
  reward: { icon: <Gift className="w-4 h-4" />, color: 'text-amber-500' },
};

export function NotificationBell() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // protectedProcedure — only poll when a cookie session actually exists,
  // otherwise every anonymous visitor fires a failing request every 30s.
  const { data: unreadCount, refetch: refetchCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 30000 }
  );

  const { data: notifications, refetch: refetchList } = trpc.notification.list.useQuery(
    { limit: 10 },
    { enabled: !!user && open }
  );

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchList();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchList();
    },
  });

  if (!user) return null;

  const count = unreadCount?.count ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
          <Bell className="w-5 h-5 text-white" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-white/10" align="end" style={{ background: 'rgba(25,20,15,0.98)', backdropFilter: 'blur(24px)' }}>
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h3 className="font-semibold text-sm text-white/90">
            {isEnglish ? 'Notifications' : '通知'}
          </h3>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs h-7"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              {isEnglish ? 'Mark all read' : '全部已读'}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <div className="p-6 text-center text-white/40 text-sm">
              {isEnglish ? 'No notifications' : '暂无通知'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 transition-colors hover:bg-white/5 ${
                    !notification.isRead ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${typeConfig[notification.type as NotificationType]?.color || 'text-gray-500'}`}>
                      {typeConfig[notification.type as NotificationType]?.icon || <Info className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium truncate text-white/90">{notification.title}</h4>
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                            className="text-blue-500 hover:text-blue-600 flex-shrink-0"
                            title={isEnglish ? 'Mark as read' : '标记已读'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{notification.content}</p>
                      <p className="text-xs text-white/25 mt-1">
                        {new Date(notification.createdAt).toLocaleString(isEnglish ? 'en-US' : 'zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
