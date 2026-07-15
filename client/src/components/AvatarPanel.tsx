import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useTranslation } from 'react-i18next';
import { Cat, Rabbit, Dog, Bird, Squirrel, Bug, Fish, Turtle } from 'lucide-react';

// 基础图标头像 - 用Lucide动物图标替代emoji
const FREE_AVATAR_ICONS = [
  { id: 'cat', icon: Cat, labelZh: '猫咪', labelEn: 'Cat' },
  { id: 'rabbit', icon: Rabbit, labelZh: '兔子', labelEn: 'Rabbit' },
  { id: 'dog', icon: Dog, labelZh: '狗狗', labelEn: 'Dog' },
  { id: 'bird', icon: Bird, labelZh: '小鸟', labelEn: 'Bird' },
  { id: 'squirrel', icon: Squirrel, labelZh: '松鼠', labelEn: 'Squirrel' },
  { id: 'bug', icon: Bug, labelZh: '虫虫', labelEn: 'Bug' },
  { id: 'fish', icon: Fish, labelZh: '摸鱼', labelEn: 'Fish' },
  { id: 'turtle', icon: Turtle, labelZh: '乌龟', labelEn: 'Turtle' },
];

// 摸鱼猫原创IP头像 - 优化后CDN URLs (256x256, 原始2048x2048)
// WebP: ~7KB/张 (vs 原始4-6MB) = 99.8%压缩率
const _supportsWebP = typeof document !== 'undefined' && document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
const avatarUrl = (webp: string, png: string) => _supportsWebP ? webp : png;

const MOYU_CAT_AVATARS = {
  // 基础版（免费）
  free: [
    { 
      id: 'moyu-cat-main', 
      name: '慵懒猫', 
      url: avatarUrl('/assets/moyu/NtxSPKrbOftkNBXA.webp', '/assets/moyu/IbVspjqpdLodmUgX.png'),
      requiredLevel: 'free'
    },
  ],
  // VIP会员专属
  vip: [
    { 
      id: 'moyu-cat-happy', 
      name: '开心猫', 
      url: avatarUrl('/assets/moyu/RmIOLJgIqRufqvUz.webp', '/assets/moyu/mXrMBXwKBPukePcs.png'),
      requiredLevel: 'vip'
    },
    { 
      id: 'moyu-cat-sleepy', 
      name: '困倦猫', 
      url: avatarUrl('/assets/moyu/UWMIwmYJQoexbKUS.webp', '/assets/moyu/YNDlXnwToDtbvNBO.png'),
      requiredLevel: 'vip'
    },
    { 
      id: 'moyu-cat-cool', 
      name: '墨镜猫', 
      url: avatarUrl('/assets/moyu/ktGjrXTZQOvkUUUy.webp', '/assets/moyu/xOGsEehPHfHyiUnk.png'),
      requiredLevel: 'vip'
    },
    { 
      id: 'moyu-cat-rich', 
      name: '财神猫', 
      url: avatarUrl('/assets/moyu/ihKfPJfeZNxiAwNh.webp', '/assets/moyu/hANkPrILgIVLcTHS.png'),
      requiredLevel: 'vip'
    },
    { 
      id: 'moyu-cat-zen', 
      name: '禅修猫', 
      url: avatarUrl('/assets/moyu/koBdAuZQfhvwVlZw.webp', '/assets/moyu/BkiPydcLxSIpBuTT.png'),
      requiredLevel: 'vip'
    },
  ],
  // 永久会员专属
  lifetime: [
    { 
      id: 'moyu-cat-diamond', 
      name: '钻石猫', 
      url: avatarUrl('/assets/moyu/DbhHnkPvKRQJAoHh.webp', '/assets/moyu/AQStiCIKoZwGWceH.png'),
      requiredLevel: 'lifetime'
    },
    { 
      id: 'moyu-cat-wizard', 
      name: '魔法猫', 
      url: avatarUrl('/assets/moyu/yreHVXVadQrYlqIL.webp', '/assets/moyu/eRbzfoNDJLpeceUW.png'),
      requiredLevel: 'lifetime'
    },
    { 
      id: 'moyu-cat-astronaut', 
      name: '太空猫', 
      url: avatarUrl('/assets/moyu/hZHSAwpvzSKtBFmw.webp', '/assets/moyu/bDxLyODlMhPIGlZL.png'),
      requiredLevel: 'lifetime'
    },
  ],
};
const ALL_MOYU_CAT_AVATARS = Object.values(MOYU_CAT_AVATARS).flat();

interface AvatarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAvatar: string;
  onSelectAvatar: (avatar: string) => void;
}

export default function AvatarPanel({
  isOpen,
  onClose,
  selectedAvatar,
  onSelectAvatar,
}: AvatarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.to(overlayRef.current, {
        opacity: 1,
        visibility: 'visible',
        duration: 0.3,
      });
      gsap.to(panelRef.current, {
        y: 0,
        duration: 0.4,
        ease: 'back.out(1.2)',
      });
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          gsap.set(overlayRef.current, { visibility: 'hidden' });
        },
      });
      gsap.to(panelRef.current, {
        y: '100%',
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isOpen]);

  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');

  const handleSelect = (avatar: string) => {
    onSelectAvatar(avatar);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setTimeout(onClose, 200);
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-40 invisible opacity-0"
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        ref={panelRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] max-h-[80vh] overflow-y-auto"
        style={{ transform: 'translateY(100%)' }}
      >
        {/* 拖动手柄 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 标题 */}
        <div className="text-center pb-4">
          <h3 className="text-lg font-semibold text-gray-800">{isEnglish ? 'Choose Your Avatar' : '选择你的头像'}</h3>
          <p className="text-sm text-gray-500">{isEnglish ? 'Tap to select a cute icon' : '点击选择一个可爱的图标'}</p>
        </div>

        {/* 验证期全部头像免费开放，不提前承诺付费权益 */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Cat className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-orange-600 font-medium">{isEnglish ? 'MoYu Cat' : '摸鱼猫 MoYu Cat'}</p>
            <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">NEW</span>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {ALL_MOYU_CAT_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.url)}
                className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  avatar.url === selectedAvatar
                    ? 'border-[3px] border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.25)]'
                    : 'border-[3px] border-orange-200 hover:scale-110'
                }`}
                title={avatar.name}
              >
                <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="px-6 pb-4">
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-2">{isEnglish ? 'Classic Icons' : '经典图标头像'}</p>
          </div>
        </div>

        {/* 免费图标头像 */}
        <div className="px-6 pb-4">
          <div className="flex justify-center gap-3 flex-wrap">
            {FREE_AVATAR_ICONS.map((item) => {
              const IconComp = item.icon;
              const avatarId = `icon:${item.id}`;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(avatarId)}
                  className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    avatarId === selectedAvatar
                      ? 'bg-orange-50 border-[3px] border-[#FF8C3A] shadow-[0_0_0_3px_rgba(255,140,58,0.25)]'
                      : 'bg-[#FFF5EB] border-[3px] border-transparent hover:scale-110'
                  }`}
                  title={isEnglish ? item.labelEn : item.labelZh}
                >
                  <IconComp className="w-7 h-7 text-orange-500" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 底部安全区域 */}
        <div className="h-6" />
      </div>
    </>
  );
}
