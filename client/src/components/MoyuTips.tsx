import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Lightbulb } from 'lucide-react';

const TIPS_ZH = [
  "摸鱼时记得保持屏幕亮度，假装在看文档",
  "戴上耳机，别人就不好意思打扰你了",
  "打开一个Excel，摸鱼更有安全感",
  "泡杯咖啡，享受带薪喝水的快乐",
  "每小时起来走动一下，顺便观察老板动向",
  "手机放桌下，抬头看屏幕，低头看手机",
  "分屏操作：一边工作，一边摸鱼",
  "准备一个假装很忙的文档，随时切换",
  "设置一个假日历提醒，给自己创造休息时间",
  "下班前30分钟是最佳摸鱼时段",
  "茶水间是社交摸鱼的好去处",
  "看技术文章也是一种高级摸鱼",
  "午休时间是正大光明摸鱼的黄金时段",
  "闭眼思考问题，其实是在养神",
  "保持好心情，摸鱼效率更高",
];

const TIPS_EN = [
  "Keep screen brightness up, pretend to read docs",
  "Wear headphones, people won't disturb you",
  "Open Excel for a sense of security",
  "Make coffee, enjoy paid hydration time",
  "Walk around hourly, scout for the boss",
  "Phone under desk, eyes on screen",
  "Split screen: work on one, slack on other",
  "Keep a 'busy' document ready to switch",
  "Set fake calendar reminders for breaks",
  "Last 30 mins before leaving = prime slack time",
  "Break room is perfect for social slacking",
  "Reading tech articles is advanced slacking",
  "Lunch break is golden slacking hour",
  "Closing eyes to think = recharging",
  "Good mood = higher slacking efficiency",
];

export function MoyuTips() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const tips = isEnglish ? TIPS_EN : TIPS_ZH;
  
  const [currentTip, setCurrentTip] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      changeTip();
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const changeTip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
      setIsAnimating(false);
    }, 250);
  };

  return (
    <div 
      className="mx-1 p-2.5 rounded-xl relative overflow-hidden group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* 微妙的顶部光泽 */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)' }}
      />
      
      <div className="flex items-start gap-2.5 relative">
        {/* 图标 */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)',
            }}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400/80" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span 
              className="text-white/35 text-[9px] tracking-[2px] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? "Tips" : "摸鱼贴士"}
            </span>
            <button 
              onClick={changeTip}
              className="w-4 h-4 rounded-full flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
              title={isEnglish ? "Next tip" : "换一条"}
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>
          <p 
            className={`text-white/70 text-[12px] leading-relaxed transition-all duration-300 ${
              isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
          >
            {tips[currentTip]}
          </p>
        </div>
      </div>
    </div>
  );
}
