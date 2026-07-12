import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { 
  ChevronLeft, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  ThumbsUp, 
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  User,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'closed';
type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'other';

const statusConfig: Record<FeedbackStatus, { label: string; labelEn: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待处理', labelEn: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: '已查看', labelEn: 'Reviewed', color: 'bg-blue-100 text-blue-700', icon: <Eye className="w-3 h-3" /> },
  resolved: { label: '已解决', labelEn: 'Resolved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  closed: { label: '已关闭', labelEn: 'Closed', color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3 h-3" /> },
};

const typeConfig: Record<FeedbackType, { label: string; labelEn: string; icon: React.ReactNode }> = {
  bug: { label: '问题报告', labelEn: 'Bug', icon: <Bug className="w-4 h-4" /> },
  feature: { label: '功能建议', labelEn: 'Feature', icon: <Lightbulb className="w-4 h-4" /> },
  suggestion: { label: '体验反馈', labelEn: 'Suggestion', icon: <ThumbsUp className="w-4 h-4" /> },
  other: { label: '其他', labelEn: 'Other', icon: <HelpCircle className="w-4 h-4" /> },
};

export default function AdminFeedback() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const { user, loading: authLoading } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');

  const { data: feedbackList, isLoading, refetch } = trpc.feedback.list.useQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter },
    { enabled: user?.role === 'admin' }
  );

  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(isEnglish ? 'Status updated' : '状态已更新');
      refetch();
    },
    onError: () => {
      toast.error(isEnglish ? 'Failed to update' : '更新失败');
    },
  });

  const replyMutation = trpc.feedback.reply.useMutation({
    onSuccess: () => {
      toast.success(isEnglish ? 'Reply sent and user notified' : '回复已发送，用户已收到通知');
      setSelectedFeedback(null);
      setReplyContent('');
      refetch();
    },
    onError: () => {
      toast.error(isEnglish ? 'Failed to send reply' : '回复发送失败');
    },
  });

  const handleStatusChange = (id: number, status: FeedbackStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleReply = () => {
    if (!selectedFeedback || !replyContent.trim()) return;
    replyMutation.mutate({
      id: selectedFeedback.id,
      reply: replyContent.trim(),
    });
  };

  // 权限检查
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 to-orange-500 flex items-center justify-center">
        <div className="text-white">{isEnglish ? 'Loading...' : '加载中...'}</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 to-orange-500 flex flex-col items-center justify-center p-4">
        <div className="text-white text-xl mb-4">
          {isEnglish ? 'Admin access required' : '需要管理员权限'}
        </div>
        <Link href="/">
          <Button variant="outline" className="bg-white/20 text-white border-white/30">
            {isEnglish ? 'Back to Home' : '返回首页'}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1a1008 0%, #0d0a06 100%)' }}>
      {/* 头部 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/">
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-xl font-bold">
              {isEnglish ? 'Feedback Management' : '反馈管理'}
            </h1>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'reviewed', 'resolved', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {status === 'all' 
                ? (isEnglish ? 'All' : '全部')
                : (isEnglish ? statusConfig[status].labelEn : statusConfig[status].label)
              }
            </button>
          ))}
        </div>
      </div>

      {/* 反馈列表 */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            {isEnglish ? 'Loading...' : '加载中...'}
          </div>
        ) : !feedbackList?.length ? (
          <div className="text-center py-8 text-gray-500">
            {isEnglish ? 'No feedback yet' : '暂无反馈'}
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((item: any) => (
              <div
                key={item.id}
                className="rounded-xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {/* 头部信息 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      statusConfig[item.status as FeedbackStatus].color
                    }`}>
                      {statusConfig[item.status as FeedbackStatus].icon}
                      {isEnglish 
                        ? statusConfig[item.status as FeedbackStatus].labelEn
                        : statusConfig[item.status as FeedbackStatus].label
                      }
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {typeConfig[item.type as FeedbackType].icon}
                      {isEnglish 
                        ? typeConfig[item.type as FeedbackType].labelEn
                        : typeConfig[item.type as FeedbackType].label
                      }
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    #{item.id} · {new Date(item.createdAt).toLocaleString(isEnglish ? 'en-US' : 'zh-CN')}
                  </span>
                </div>

                {/* 反馈内容 */}
                <p className="text-white/80 mb-3 whitespace-pre-wrap">{item.content}</p>

                {/* 用户信息 */}
                <div className="flex items-center gap-4 text-xs text-white/40 mb-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {item.userId ? `用户 #${item.userId}` : (isEnglish ? 'Anonymous' : '匿名用户')}
                  </span>
                  {item.contact && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {item.contact}
                    </span>
                  )}
                </div>

                {/* 管理员回复 */}
                {item.adminReply && (
                  <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <div className="text-xs text-amber-400 font-medium mb-1">
                      {isEnglish ? 'Admin Reply' : '管理员回复'}
                    </div>
                    <p className="text-white/70 text-sm whitespace-pre-wrap">{item.adminReply}</p>
                    {item.repliedAt && (
                      <div className="text-xs text-white/30 mt-1">
                        {new Date(item.repliedAt).toLocaleString(isEnglish ? 'en-US' : 'zh-CN')}
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFeedback(item);
                      setReplyContent(item.adminReply || '');
                    }}
                    className="text-xs"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {item.adminReply ? (isEnglish ? 'Edit Reply' : '编辑回复') : (isEnglish ? 'Reply' : '回复')}
                  </Button>
                  
                  {item.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, 'reviewed')}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {isEnglish ? 'Mark Reviewed' : '标记已查看'}
                    </Button>
                  )}
                  
                  {(item.status === 'pending' || item.status === 'reviewed') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, 'resolved')}
                      className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {isEnglish ? 'Mark Resolved' : '标记已解决'}
                    </Button>
                  )}
                  
                  {item.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, 'closed')}
                      className="text-xs text-gray-500 border-gray-200 hover:bg-gray-50"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      {isEnglish ? 'Close' : '关闭'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 回复弹窗 */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-md border-white/10" style={{ background: 'rgba(25,20,15,0.98)' }}>
          <DialogHeader>
            <DialogTitle>
              {isEnglish ? 'Reply to Feedback' : '回复反馈'} #{selectedFeedback?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-xs text-white/40 mb-1">
                {isEnglish ? 'Original feedback:' : '原始反馈：'}
              </div>
              <p className="text-sm text-white/80">{selectedFeedback?.content}</p>
            </div>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={isEnglish ? 'Enter your reply...' : '输入回复内容...'}
              className="min-h-[120px] border-white/10 bg-white/5 text-white/90 placeholder:text-white/25"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedFeedback(null)}
              >
                {isEnglish ? 'Cancel' : '取消'}
              </Button>
              <Button
                onClick={handleReply}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {replyMutation.isPending 
                  ? (isEnglish ? 'Sending...' : '发送中...') 
                  : (isEnglish ? 'Send & Notify User' : '发送并通知用户')
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
