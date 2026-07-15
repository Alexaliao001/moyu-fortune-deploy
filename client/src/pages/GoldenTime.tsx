import { useState, useEffect } from 'react';
import { Clock, Lightbulb, Sparkles, Coffee, UtensilsCrossed, Moon, PersonStanding, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOYU_TIP_ILLUSTRATIONS } from '@/config/moyuCatAssets';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';

const GOLDEN_TIME_ICONS = [Coffee, UtensilsCrossed, Moon, PersonStanding];

const GOLDEN_TIMES = [
  { start: '09:30', end: '10:30', label: '早会后', labelEn: 'After Morning Meeting', iconIdx: 0 },
  { start: '11:30', end: '12:00', label: '午饭前', labelEn: 'Before Lunch', iconIdx: 1 },
  { start: '14:00', end: '15:30', label: '午后困倦', labelEn: 'Afternoon Slump', iconIdx: 2 },
  { start: '16:30', end: '17:30', label: '下班前', labelEn: 'Before Leaving', iconIdx: 3 },
];

const MOYU_TIPS = [
  {
    id: 'toilet',
    titleZh: '带薪上厕所',
    titleEn: 'Paid Bathroom Break',
    descZh: '每次10-15分钟，一天3次，年薪多赚一个月',
    descEn: '10-15 mins each, 3 times a day, earn an extra month salary',
    image: MOYU_TIP_ILLUSTRATIONS.toilet.url,
  },
  {
    id: 'busy',
    titleZh: '假装很忙',
    titleEn: 'Look Busy',
    descZh: '打开多个窗口，时不时敲键盘，眉头紧锁',
    descEn: 'Open multiple windows, type occasionally, frown deeply',
    image: MOYU_TIP_ILLUSTRATIONS.busy.url,
  },
  {
    id: 'meeting',
    titleZh: '开会神游',
    titleEn: 'Meeting Daydream',
    descZh: '身在会议室，心在九霄云外，偶尔点头表示认同',
    descEn: 'Body in meeting, mind elsewhere, nod occasionally',
    image: MOYU_TIP_ILLUSTRATIONS.meeting.url,
  },
  {
    id: 'coffee',
    titleZh: '咖啡时间',
    titleEn: 'Coffee Time',
    descZh: '一杯咖啡，半小时摸鱼，顺便社交一下',
    descEn: 'One coffee, 30 mins break, plus some socializing',
    image: MOYU_TIP_ILLUSTRATIONS.coffee.url,
  },
];

export default function GoldenTime() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentGoldenTime, setCurrentGoldenTime] = useState<typeof GOLDEN_TIMES[0] | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const h = currentTime.getHours().toString().padStart(2, '0');
    const m = currentTime.getMinutes().toString().padStart(2, '0');
    const now = `${h}:${m}`;
    setCurrentGoldenTime(GOLDEN_TIMES.find(gt => now >= gt.start && now <= gt.end) || null);
  }, [currentTime]);

  const getNextGoldenTime = () => {
    const h = currentTime.getHours().toString().padStart(2, '0');
    const m = currentTime.getMinutes().toString().padStart(2, '0');
    const now = `${h}:${m}`;
    for (const gt of GOLDEN_TIMES) {
      if (now < gt.start) return gt;
    }
    return GOLDEN_TIMES[0];
  };

  const nextGoldenTime = !currentGoldenTime ? getNextGoldenTime() : null;

  // 计算进度条
  const getProgress = () => {
    if (!currentGoldenTime) return 0;
    const [sh, sm] = currentGoldenTime.start.split(':').map(Number);
    const [eh, em] = currentGoldenTime.end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    return Math.min(100, Math.max(0, ((nowMin - startMin) / (endMin - startMin)) * 100));
  };

  return (
    <PageLayout title={isEnglish ? 'Golden Slacking Time' : '黄金摸鱼时段'}>
      <div className="space-y-4 pt-2">

        {/* 当前状态 */}
        <GlassCard accent={currentGoldenTime ? 'gold' : 'none'} glow={!!currentGoldenTime}>
          <div className="p-5 text-center">
            <div className="mb-3 flex justify-center">
              {currentGoldenTime 
                ? <Timer className="w-9 h-9 text-amber-400" />
                : <Clock className="w-9 h-9 text-white/30" />
              }
            </div>
            
            {currentGoldenTime ? (
              <>
                <h2 className="text-white font-display text-2xl mb-1">
                  {isEnglish ? currentGoldenTime.labelEn : currentGoldenTime.label}
                </h2>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
                  style={{ background: 'rgba(255,180,50,0.15)', border: '1px solid rgba(255,180,50,0.3)' }}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-bold text-sm">
                    {currentGoldenTime.start} - {currentGoldenTime.end}
                  </span>
                </div>
                {/* 进度条 */}
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${getProgress()}%`,
                      background: 'linear-gradient(90deg, #FFB32C, #FF8C00)',
                    }}
                  />
                </div>
                <p className="text-amber-400/60 text-xs mt-2">
                  {isEnglish ? 'Perfect time to slack!' : '正是摸鱼好时机！'}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-white/60 font-display text-xl mb-1">
                  {isEnglish ? 'Not Golden Time Yet' : '还不是黄金时段'}
                </h2>
                {nextGoldenTime && (
                  <div className="space-y-1">
                    <p className="text-white/30 text-xs">
                      {isEnglish ? 'Next golden time:' : '下一个黄金时段：'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-white/60 text-sm font-bold">
                        {nextGoldenTime.start} - {nextGoldenTime.end}
                      </span>
                      <span className="text-white/30 text-xs">
                        {isEnglish ? nextGoldenTime.labelEn : nextGoldenTime.label}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </GlassCard>

        {/* 所有黄金时段 */}
        <div className="grid grid-cols-2 gap-2">
          {GOLDEN_TIMES.map((gt, index) => {
            const isActive = currentGoldenTime?.start === gt.start;
            return (
              <GlassCard key={index} accent={isActive ? 'gold' : 'none'}>
                <div className="p-3 text-center">
                  {(() => { const Icon = GOLDEN_TIME_ICONS[gt.iconIdx]; return <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-white/40'}`} />; })()}
                  <div className={`font-bold text-xs mt-1 ${isActive ? 'text-amber-400' : 'text-white/60'}`}>
                    {gt.start} - {gt.end}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-amber-400/60' : 'text-white/30'}`}>
                    {isEnglish ? gt.labelEn : gt.label}
                  </div>
                  {isActive && (
                    <div className="mt-1.5 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400 text-[9px] font-bold">ACTIVE</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* 摸鱼小技巧 */}
        <GlassCard>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h3 className="text-white/80 text-xs font-bold tracking-wider">
                {isEnglish ? 'SLACKING TIPS' : '摸鱼小技巧'}
              </h3>
            </div>

            <div className="space-y-2.5">
              {MOYU_TIPS.map((tip) => (
                <div key={tip.id} className="flex items-start gap-3 p-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <img
                    src={tip.image}
                    alt={isEnglish ? tip.titleEn : tip.titleZh}
                    className="w-12 h-12 object-contain flex-shrink-0 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white/80 font-bold text-xs">
                      {isEnglish ? tip.titleEn : tip.titleZh}
                    </h4>
                    <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                      {isEnglish ? tip.descEn : tip.descZh}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </PageLayout>
  );
}
