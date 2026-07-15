// 事件追踪工具 - 用于统计用户行为

// 事件类型定义
export type EventCategory = 
  | 'fortune'      // 抽签相关
  | 'share'        // 分享相关
  | 'membership'   // 会员相关
  | 'invite'       // 邀请相关
  | 'pwa'          // PWA 相关
  | 'engagement';  // 用户互动

export interface TrackEventParams {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
}

// 检查 Umami 是否可用
function isUmamiAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).umami !== 'undefined';
}

// 追踪事件
export function trackEvent({ category, action, label, value }: TrackEventParams): void {
  // 构建事件名称
  const eventName = `${category}_${action}`;
  
  // 构建事件数据
  const eventData: Record<string, any> = {};
  if (label) eventData.label = label;
  if (value !== undefined) eventData.value = value;

  // 发送到 Umami
  if (isUmamiAvailable()) {
    try {
      (window as any).umami.track(eventName, eventData);
    } catch (e) {
      console.warn('Analytics tracking failed:', e);
    }
  }

  // 开发环境下打印日志
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, eventData);
  }
}

// 预定义的事件追踪函数

// 抽签相关
export const trackFortuneDraw = (level: string, percent: number) => {
  trackEvent({
    category: 'fortune',
    action: 'draw',
    label: level,
    value: percent,
  });
};

export const trackFortuneRetry = () => {
  trackEvent({
    category: 'fortune',
    action: 'retry',
  });
};

// 分享相关
export const trackShare = (platform: string) => {
  trackEvent({
    category: 'share',
    action: 'click',
    label: platform,
  });
};

export const trackSharePoster = () => {
  trackEvent({
    category: 'share',
    action: 'poster_generate',
  });
};

export const trackShareCopy = () => {
  trackEvent({
    category: 'share',
    action: 'copy_text',
  });
};

// 会员相关
export const trackMembershipView = () => {
  trackEvent({
    category: 'membership',
    action: 'page_view',
  });
};

export const trackMembershipClick = (plan: string) => {
  trackEvent({
    category: 'membership',
    action: 'plan_click',
    label: plan,
  });
};

export const trackPaymentStart = (plan: string, amount: number) => {
  trackEvent({
    category: 'membership',
    action: 'payment_start',
    label: plan,
    value: amount,
  });
};

export const trackPaymentSuccess = (plan: string) => {
  trackEvent({
    category: 'membership',
    action: 'payment_success',
    label: plan,
  });
};

// 邀请相关
export const trackInviteView = () => {
  trackEvent({
    category: 'invite',
    action: 'page_view',
  });
};

export const trackInviteCopy = () => {
  trackEvent({
    category: 'invite',
    action: 'code_copy',
  });
};

export const trackInviteShare = (platform: string) => {
  trackEvent({
    category: 'invite',
    action: 'share',
    label: platform,
  });
};

// PWA 相关
export const trackPWAPromptShow = () => {
  trackEvent({
    category: 'pwa',
    action: 'prompt_show',
  });
};

export const trackPWAInstall = () => {
  trackEvent({
    category: 'pwa',
    action: 'install',
  });
};

export const trackPWADismiss = () => {
  trackEvent({
    category: 'pwa',
    action: 'dismiss',
  });
};

// 用户互动
export const trackAvatarSelect = (avatar: string) => {
  trackEvent({
    category: 'engagement',
    action: 'avatar_select',
    label: avatar,
  });
};

export const trackLanguageSwitch = (language: string) => {
  trackEvent({
    category: 'engagement',
    action: 'language_switch',
    label: language,
  });
};

export const trackSoundToggle = (enabled: boolean) => {
  trackEvent({
    category: 'engagement',
    action: 'sound_toggle',
    label: enabled ? 'on' : 'off',
  });
};
