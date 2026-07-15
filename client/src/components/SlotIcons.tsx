/**
 * 摸鱼猫IP风格老虎机图标 - AI生成的金色橘猫插画
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
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/HxmOknthSUeWcUWT.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/WyaYMVfnuTSsGDVq.png',
  },
  {
    name: 'gaming',
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/sbDkgQVfSUWcWAYH.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/QtLjZtLiIftiYbmS.png',
  },
  {
    name: 'fishing',
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/RFeuFFEDpugNdkyL.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/pAlCCKveTjxNANlG.png',
  },
  {
    name: 'coffee',
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/dwizniBaXvUZrpkb.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/yzbiElVKyHIrzfyU.png',
  },
  {
    name: 'lazy',
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/SLakwZBlrjqZEkAt.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/YOqFgzCcYfXxWGgF.png',
  },
  {
    name: 'lucky',
    webp: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/TMvSonHIAftmNtTB.webp',
    png: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/LigaxsfpniOQSBlM.png',
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
