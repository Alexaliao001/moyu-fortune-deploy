import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Bug, Lightbulb, ThumbsUp, HelpCircle, Send, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { hasLightApi, lightSubmitFeedback } from '@/lib/lightApi';
import { getUserId } from '@/lib/localStorage';
import { isStaticMode } from '@/lib/staticMode';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'other';

const feedbackTypes: { type: FeedbackType; icon: React.ReactNode }[] = [
  { type: 'bug', icon: <Bug className="w-4 h-4" /> },
  { type: 'feature', icon: <Lightbulb className="w-4 h-4" /> },
  { type: 'suggestion', icon: <ThumbsUp className="w-4 h-4" /> },
  { type: 'other', icon: <HelpCircle className="w-4 h-4" /> },
];

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const light = hasLightApi();
  const staticMode = isStaticMode();

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setSubmitted(false);
          setType('suggestion');
          setContent('');
          setContact('');
        }, 300);
      }, 2000);
    },
    onError: () => {
      toast.error(t('feedback.error'));
    },
  });

  const markSuccess = () => {
    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setSubmitted(false);
        setType('suggestion');
        setContent('');
        setContact('');
      }, 300);
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t('feedback.contentPlaceholder'));
      return;
    }

    if (light) {
      setPending(true);
      const result = await lightSubmitFeedback({
        deviceId: getUserId(),
        type,
        content: content.trim(),
        contact: contact.trim() || undefined,
        userAgent: navigator.userAgent,
      });
      setPending(false);
      if (!result.ok) {
        toast.error(t('feedback.error'));
        return;
      }
      markSuccess();
      return;
    }

    if (staticMode) {
      toast.message(
        t('feedback.error'),
        { description: 'Static demo — set VITE_MOYU_API_BASE for cloud feedback.' }
      );
      return;
    }

    submitMutation.mutate({
      type,
      content: content.trim(),
      contact: contact.trim() || undefined,
      userAgent: navigator.userAgent,
    });
  };

  const isSubmitting = pending || submitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-white/10" style={{ background: 'rgba(25,20,15,0.98)', backdropFilter: 'blur(24px)' }}>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white/90 mb-2">
              {t('feedback.success')}
            </h3>
            <p className="text-white/50 text-sm">
              {t('feedback.successDesc')}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-orange-500 to-amber-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg font-bold">
                      {t('feedback.title')}
                    </DialogTitle>
                    <p className="text-white/80 text-xs mt-0.5">
                      {t('feedback.subtitle')}
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  {t('feedback.type')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {feedbackTypes.map(({ type: feedbackType, icon }) => (
                    <button
                      key={feedbackType}
                      onClick={() => setType(feedbackType)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        type === feedbackType
                          ? 'border-amber-500 text-amber-400'
                          : 'border-white/10 hover:border-white/20 text-white/50'
                      }`}
                      style={type === feedbackType ? { background: 'rgba(245,158,11,0.1)' } : { background: 'rgba(255,255,255,0.03)' }}
                    >
                      {icon}
                      <span className="text-xs font-medium">
                        {t(`feedback.types.${feedbackType}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  {t('feedback.content')} <span className="text-red-400">*</span>
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('feedback.contentPlaceholder')}
                  className="min-h-[120px] resize-none border-white/10 bg-white/5 text-white/90 placeholder:text-white/25 focus:border-amber-500 focus:ring-amber-500"
                  maxLength={1000}
                />
                <p className="text-xs text-white/30 mt-1 text-right">
                  {content.length}/1000
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  {t('feedback.contact')}
                </label>
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t('feedback.contactPlaceholder')}
                  className="border-white/10 bg-white/5 text-white/90 placeholder:text-white/25 focus:border-amber-500 focus:ring-amber-500"
                  maxLength={255}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-12 rounded-xl font-medium"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {t('feedback.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('feedback.submit')}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
