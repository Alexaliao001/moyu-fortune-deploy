/**
 * 摸鱼猫 IP 风格老虎机图标
 * 6个图标：睡觉猫、游戏猫、钓鱼猫、咖啡猫、偷懒猫、招财猫
 */

// WebP优先，PNG降级
const supportsWebP = (() => {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
})();

interface SlotIconData {
  name: string;
  webp: string;
  png: string;
}

const SLOT_ICONS: SlotIconData[] = [
  {
    name: 'sleep',
    webp: '/assets/moyu/HxmOknthSUeWcUWT.webp',
    png: '/assets/moyu/WyaYMVfnuTSsGDVq.png',
  },
  {
    name: 'gaming',
    webp: '/assets/moyu/sbDkgQVfSUWcWAYH.webp',
    png: '/assets/moyu/QtLjZtLiIftiYbmS.png',
  },
  {
    name: 'fishing',
    webp: '/assets/moyu/RFeuFFEDpugNdkyL.webp',
    png: '/assets/moyu/pAlCCKveTjxNANlG.png',
  },
  {
    name: 'coffee',
    webp: '/assets/moyu/dwizniBaXvUZrpkb.webp',
    png: '/assets/moyu/yzbiElVKyHIrzfyU.png',
  },
  {
    name: 'lazy',
    webp: '/assets/moyu/SLakwZBlrjqZEkAt.webp',
    png: '/assets/moyu/YOqFgzCcYfXxWGgF.png',
  },
  {
    name: 'lucky',
    webp: '/assets/moyu/TMvSonHIAftmNtTB.webp',
    png: '/assets/moyu/LigaxsfpniOQSBlM.png',
  },
];

// 图标数量（供SlotMachine使用）
export const SLOT_ICON_COMPONENTS = SLOT_ICONS;

export function SlotIcon({ index, size = 48 }: { index: number; size?: number }) {
  const icon = SLOT_ICONS[index % SLOT_ICONS.length];
  const src = supportsWebP ? icon.webp : icon.png;
  
  return (
    <img
      src={src}
      alt={icon.name}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        imageRendering: 'auto',
      }}
    />
  );
}
