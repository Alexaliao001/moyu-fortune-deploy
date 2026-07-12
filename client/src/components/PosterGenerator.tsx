import { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Sparkles, Cat } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

interface PosterGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  fortuneData: {
    level: string;
    emoji: string;
    percent: number;
    message: string;
    suggestedTime: string;
    beatPercent: number;
  };
}

type PosterStyle = 'classic' | 'meme';

const levelColors: Record<string, { bg: string; accent: string; text: string }> = {
  '大吉': { bg: '#FFD54F', accent: '#FF9800', text: '#E65100' },
  '中吉': { bg: '#FFB74D', accent: '#F57C00', text: '#E65100' },
  '小吉': { bg: '#4FC3F7', accent: '#0288D1', text: '#01579B' },
  '末吉': { bg: '#90A4AE', accent: '#546E7A', text: '#37474F' },
  '凶': { bg: '#78909C', accent: '#455A64', text: '#263238' },
};

// 梗图风格的配色和表情
const memeStyles: Record<string, { bg: string; emoji: string; slogan: string; sloganEn: string }> = {
  '大吉': { 
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
    emoji: '😎🎉', 
    slogan: '老板看了会沉默',
    sloganEn: 'Boss will be speechless'
  },
  '中吉': { 
    bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
    emoji: '🐱💤', 
    slogan: '摸鱼使我快乐',
    sloganEn: 'Slacking makes me happy'
  },
  '小吉': { 
    bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
    emoji: '🐟✨', 
    slogan: '今天也是摸鱼的一天',
    sloganEn: 'Another day of slacking'
  },
  '末吉': { 
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', 
    emoji: '😐💼', 
    slogan: '假装很忙.jpg',
    sloganEn: 'Pretending to be busy.jpg'
  },
  '凶': { 
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
    emoji: '😰📊', 
    slogan: '今天不宜摸鱼',
    sloganEn: 'Not a good day to slack'
  },
};

export default function PosterGenerator({ isOpen, onClose, fortuneData }: PosterGeneratorProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterStyle, setPosterStyle] = useState<PosterStyle>('meme');

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      generatePoster();
    }
  }, [isOpen, fortuneData, posterStyle]);

  const generatePoster = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);

    if (posterStyle === 'meme') {
      await generateMemePoster(canvas);
    } else {
      await generateClassicPoster(canvas);
    }
  };

  // 梗图风格海报
  const generateMemePoster = async (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 750;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;

    const memeStyle = memeStyles[fortuneData.level] || memeStyles['小吉'];
    const colors = levelColors[fortuneData.level] || levelColors['小吉'];

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.bg);
    gradient.addColorStop(0.5, colors.accent);
    gradient.addColorStop(1, colors.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 添加噪点纹理效果
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 1000; i++) {
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        2,
        2
      );
    }

    // 装饰性圆圈
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(100, 150, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(650, 850, 120, 0, Math.PI * 2);
    ctx.fill();

    // 顶部标签
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 120, 50, 240, 50, 25);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isEnglish ? '🐟 SLACKING FORTUNE' : '🐟 摸鱼运势', width / 2, 83);

    // 大号表情
    ctx.font = '180px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(memeStyle.emoji, width / 2, 300);

    // 运势等级 - 大号
    ctx.fillStyle = 'white';
    ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    const memeLevelDisplay = isEnglish ? ({
      '大吉': 'Excellent', '中吉': 'Good', '小吉': 'Fair',
      '末吉': 'Minor', '凶': 'Bad'
    }[fortuneData.level] || fortuneData.level) : fortuneData.level;
    ctx.fillText(memeLevelDisplay, width / 2, 450);
    ctx.shadowColor = 'transparent';

    // 百分比
    ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`${fortuneData.percent}%`, width / 2, 550);

    // 梗图风格标语
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(60, 600, width - 120, 80, 20);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(isEnglish ? memeStyle.sloganEn : memeStyle.slogan, width / 2, 650);

    // 金句 - 带引号样式
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    const messageLines = wrapText(ctx, `"${fortuneData.message}"`, width - 140);
    messageLines.forEach((line, i) => {
      ctx.fillText(line, width / 2, 730 + i * 48);
    });

    // 底部信息
    const bottomY = 880;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(
      isEnglish 
        ? `🏆 Beat ${fortuneData.beatPercent}% of workers!` 
        : `🏆 打败了全国 ${fortuneData.beatPercent}% 的打工人！`, 
      width / 2, 
      bottomY
    );

    // 日期
    const today = new Date();
    const dateStr = isEnglish 
      ? today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(dateStr, width / 2, bottomY + 40);

    // 品牌 + 二维码提示
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(
      isEnglish ? 'chillworks.ai · Scan to try' : 'chillworks.ai · 扫码测运势', 
      width / 2, 
      height - 30
    );

    const url = canvas.toDataURL('image/png');
    setPosterUrl(url);
    setIsGenerating(false);
  };

  // 经典风格海报
  const generateClassicPoster = async (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 750;
    const padding = 60;
    const colors = levelColors[fortuneData.level] || levelColors['小吉'];

    // 先计算文案需要的行数来确定高度
    ctx.font = '36px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    const messageLines = wrapText(ctx, fortuneData.message, width - padding * 2 - 80);
    const messageHeight = messageLines.length * 52;

    // 动态计算总高度
    const headerHeight = 200;
    const cardTopPadding = 60;
    const levelHeight = 120;
    const emojiHeight = 140;
    const percentHeight = 100;
    const dividerHeight = 40;
    const messageAreaHeight = messageHeight + 40;
    const suggestHeight = 60;
    const cardBottomPadding = 40;
    const beatHeight = 100;
    const qrHeight = 200;
    const footerHeight = 80;

    const cardHeight = cardTopPadding + levelHeight + emojiHeight + percentHeight + dividerHeight + messageAreaHeight + suggestHeight + cardBottomPadding;
    const height = headerHeight + cardHeight + beatHeight + qrHeight + footerHeight;

    canvas.width = width;
    canvas.height = height;

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colors.bg);
    gradient.addColorStop(1, colors.accent);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 装饰圆形
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(80, 150, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(670, 300, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(100, height - 300, 60, 0, Math.PI * 2);
    ctx.fill();

    // 日期
    const today = new Date();
    const dateStr = isEnglish 
      ? today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, width / 2, 70);

    // 标题
    ctx.fillStyle = 'white';
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(isEnglish ? 'Slacking Fortune' : '今日摸鱼运势', width / 2, 140);

    // 主卡片
    const cardX = padding;
    const cardY = headerHeight;
    const cardWidth = width - padding * 2;
    const cardRadius = 30;

    // 卡片阴影
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    // 卡片背景
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.fill();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    let currentY = cardY + cardTopPadding;

    // 运势等级
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 90px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    const levelDisplay = isEnglish ? ({
      '大吉': 'Excellent', '中吉': 'Good', '小吉': 'Fair',
      '末吉': 'Minor', '凶': 'Bad'
    }[fortuneData.level] || fortuneData.level) : fortuneData.level;
    ctx.fillText(levelDisplay, width / 2, currentY + 80);
    currentY += levelHeight;

    // Emoji
    ctx.font = '100px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(fortuneData.emoji, width / 2, currentY + 90);
    currentY += emojiHeight;

    // 百分比
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`${fortuneData.percent}%`, width / 2, currentY + 60);
    currentY += percentHeight;

    // 分割线
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, currentY);
    ctx.lineTo(cardX + cardWidth - 60, currentY);
    ctx.stroke();
    currentY += dividerHeight;

    // 摸鱼宣言
    ctx.fillStyle = '#333';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    messageLines.forEach((line, i) => {
      ctx.fillText(line, width / 2, currentY + 40 + i * 52);
    });
    currentY += messageAreaHeight;

    // 建议摸鱼时长
    ctx.fillStyle = '#666';
    ctx.font = '30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(
      isEnglish 
        ? `💤 Suggested slacking time: ${fortuneData.suggestedTime}` 
        : `💤 建议摸鱼时长: ${fortuneData.suggestedTime}`, 
      width / 2, 
      currentY + 30
    );

    // 底部统计
    const beatY = cardY + cardHeight + 60;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(
      isEnglish 
        ? `🏆 Beat ${fortuneData.beatPercent}% of workers!` 
        : `🏆 摸鱼打败了全国 ${fortuneData.beatPercent}% 的打工人！`, 
      width / 2, 
      beatY
    );

    // 二维码区域
    const qrY = beatY + 50;
    try {
      const qrDataUrl = await QRCode.toDataURL(window.location.origin, {
        width: 140,
        margin: 1,
        color: {
          dark: '#333333',
          light: '#FFFFFF',
        },
      });
      const qrImage = new Image();
      qrImage.onload = () => {
        // 二维码背景
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(width / 2 - 85, qrY, 170, 190, 15);
        ctx.fill();

        ctx.drawImage(qrImage, width / 2 - 70, qrY + 15, 140, 140);

        // 二维码文字
        ctx.fillStyle = '#666';
        ctx.font = '22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.fillText(isEnglish ? 'Scan to try' : '扫码测运势', width / 2, qrY + 175);

        // 品牌
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.fillText('ChillWorks · AI for Life', width / 2, height - 30);

        const url = canvas.toDataURL('image/png');
        setPosterUrl(url);
        setIsGenerating(false);
      };
      qrImage.src = qrDataUrl;
    } catch (error) {
      console.error('QR code generation failed:', error);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
      ctx.fillText('ChillWorks · AI for Life', width / 2, height - 30);
      
      const url = canvas.toDataURL('image/png');
      setPosterUrl(url);
      setIsGenerating(false);
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const downloadPoster = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    const fileName = isEnglish 
      ? `slacking_fortune_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.png`
      : `摸鱼运势_${new Date().toLocaleDateString('zh-CN')}.png`;
    link.download = fileName;
    link.href = posterUrl;
    link.click();
    toast.success(isEnglish ? 'Poster saved!' : '海报已保存到相册');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold">
            {isEnglish ? 'Generate Poster' : '生成分享海报'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 风格选择 */}
        <div className="px-4 py-3 border-b flex gap-2">
          <button
            onClick={() => setPosterStyle('meme')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              posterStyle === 'meme'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Cat className="w-4 h-4" />
            {isEnglish ? 'Meme Style' : '梗图风格'}
          </button>
          <button
            onClick={() => setPosterStyle('classic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              posterStyle === 'classic'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isEnglish ? 'Classic Style' : '经典风格'}
          </button>
        </div>

        {/* 海报预览 */}
        <div className="flex-1 overflow-auto p-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : posterUrl ? (
            <img
              src={posterUrl}
              alt={isEnglish ? 'Share poster' : '分享海报'}
              className="w-full rounded-lg shadow-lg"
            />
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-t flex gap-3 flex-shrink-0">
          <button
            onClick={downloadPoster}
            disabled={!posterUrl || isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium disabled:opacity-50 transition-all hover:shadow-lg active:scale-95"
          >
            <Download className="w-5 h-5" />
            {isEnglish ? 'Save' : '保存海报'}
          </button>
          <button
            onClick={() => toast.info(isEnglish ? 'Long press image to save and share' : '请长按图片保存后分享')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors active:scale-95"
          >
            <Share2 className="w-5 h-5" />
            {isEnglish ? 'Share' : '分享'}
          </button>
        </div>
      </div>
    </div>
  );
}
