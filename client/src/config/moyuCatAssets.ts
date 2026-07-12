// 摸鱼猫 MoYu Cat IP 素材配置
// 所有图片已优化：2048x2048 → 256x256, WebP优先 (99.8%压缩)

const BASE = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/';
const _wp = typeof document !== 'undefined' && document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
const u = (webp: string, png: string) => BASE + (_wp ? webp : png);

// 优化后的URL映射
const IMG = {
  happy:   u('fwTvgAUBFCrwIvdf.webp', 'vPpaACXnvEiZTnXU.png'),
  smirk:   u('InXeeUbwnGNwUorl.webp', 'QkIuHuxygZhVCapd.png'),
  sleepy:  u('COdpJUFLJvKrKuRd.webp', 'HlMmcOXGUyhwlqnu.png'),
  cool:    u('AWQimrKYdVWOcjce.webp', 'UTvfSwBFJdQwFSvs.png'),
  love:    u('BTXmDXStpkfxTEBK.webp', 'NqkCNXHOQgGVaJfQ.png'),
  excited: u('uHgTjhPnLfUDENxh.webp', 'YPGGXRVNzNeQjGNM.png'),
  shock:   u('ivCbRAJDMADpKrIX.webp', 'LBxkYYkeuWoqBPsC.png'),
  meh:     u('QPfQEQgWDfMPnMIP.webp', 'rknOeqgNvWYkTEIe.png'),
  sad:     u('KrolursPNRpRPEgE.webp', 'fbkLfptEBYCkWqTM.png'),
};

// 头像系列
export const MOYU_CAT_AVATARS = {
  // 基础版（免费）
  free: [
    { id: 'happy', name: '开心猫', url: IMG.happy },
    { id: 'smirk', name: '偷笑猫', url: IMG.smirk },
    { id: 'sleepy', name: '困倦猫', url: IMG.sleepy },
  ],
  // VIP会员专属
  vip: [
    { id: 'cool', name: '墨镜猫', url: IMG.cool },
    { id: 'love', name: '比心猫', url: IMG.love },
    { id: 'excited', name: '兴奋猫', url: IMG.excited },
  ],
  // 永久会员专属
  lifetime: [
    { id: 'shock', name: '惊讶猫', url: IMG.shock },
    { id: 'meh', name: '无语猫', url: IMG.meh },
    { id: 'sad', name: '难过猫', url: IMG.sad },
  ],
};

// 表情包系列（用于老虎机滚轮）
export const MOYU_CAT_EMOJIS = [
  // 基础情绪
  { id: 'happy', name: '开心', url: IMG.happy },
  { id: 'excited', name: '兴奋', url: IMG.excited },
  { id: 'love', name: '比心', url: IMG.love },
  { id: 'smirk', name: '偷笑', url: IMG.smirk },
  // 职场情绪
  { id: 'cool', name: '墨镜', url: IMG.cool },
  { id: 'shock', name: '惊讶', url: IMG.shock },
  { id: 'meh', name: '无语', url: IMG.meh },
  { id: 'sleepy', name: '困了', url: IMG.sleepy },
  // 摸鱼专属
  { id: 'sad', name: '难过', url: IMG.sad },
];

// 运势对应的摸鱼猫表情
export const FORTUNE_CAT_EMOJIS: Record<string, { url: string; emoji: string }> = {
  '大吉': { url: IMG.cool, emoji: '😎' },
  '中吉': { url: IMG.happy, emoji: '😊' },
  '小吉': { url: IMG.smirk, emoji: '🙂' },
  '末吉': { url: IMG.meh, emoji: '😐' },
  '凶': { url: IMG.sad, emoji: '😰' },
};

// 产品内插图
export const MOYU_CAT_ILLUSTRATIONS = {
  loading: IMG.sleepy,
  empty: IMG.meh,
  success: IMG.excited,
  error: IMG.sad,
};

// 摸鱼小技巧插图
export const MOYU_TIP_ILLUSTRATIONS = {
  toilet: { url: IMG.smirk, title: '带薪上厕所', desc: '带薪摸鱼第一招' },
  busy: { url: IMG.cool, title: '假装很忙', desc: '戴上耳机假装在开会' },
  meeting: { url: IMG.sleepy, title: '开会神游', desc: '身在会议室，心在九霄云外' },
  coffee: { url: IMG.happy, title: '咖啡时间', desc: '一杯咖啡，半小时摸鱼' },
};

// 获取随机摸鱼猫表情URL
export function getRandomCatEmojiUrl(): string {
  const randomIndex = Math.floor(Math.random() * MOYU_CAT_EMOJIS.length);
  return MOYU_CAT_EMOJIS[randomIndex].url;
}

// 获取随机摸鱼猫表情数组
export function getRandomCatEmojis(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(getRandomCatEmojiUrl());
  }
  return result;
}
