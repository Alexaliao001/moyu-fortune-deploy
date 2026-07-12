import { useCallback, useRef, useState } from 'react';

// 音效类型
type SoundType = 'spin' | 'stop' | 'jackpot' | 'coinTouch' | 'leverTouch';

// 音效文件路径
const SOUND_PATHS: Record<SoundType, string> = {
  spin: '/sounds/spin.mp3',
  stop: '/sounds/stop.mp3',
  jackpot: '/sounds/jackpot.mp3',
  coinTouch: '/sounds/coin-touch.mp3',
  leverTouch: '/sounds/lever-touch.mp3',
};

// 音效配置
const SOUND_CONFIG: Record<SoundType, { volume: number; loop?: boolean }> = {
  spin: { volume: 0.3, loop: true },
  stop: { volume: 0.5 },
  jackpot: { volume: 0.6 },
  coinTouch: { volume: 0.4 },
  leverTouch: { volume: 0.35 },
};

// 本地存储key
const MUTE_STORAGE_KEY = 'moyu-sound-muted';

export function useSound() {
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    }
    return false;
  });

  // 按需获取或创建Audio实例（懒加载 - 不预加载所有音效）
  const getAudio = useCallback((type: SoundType): HTMLAudioElement => {
    let audio = audioRefs.current.get(type);
    if (!audio) {
      audio = new Audio(SOUND_PATHS[type]);
      const config = SOUND_CONFIG[type];
      audio.volume = config.volume;
      audio.loop = config.loop || false;
      // 只在首次使用时设置preload，不阻塞首屏
      audio.preload = 'auto';
      audioRefs.current.set(type, audio);
    }
    return audio;
  }, []);

  // 播放音效 - 首次调用时才创建Audio实例
  const play = useCallback((type: SoundType) => {
    if (isMuted) return;

    const audio = getAudio(type);
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.log('Audio play failed:', err.message);
    });
  }, [isMuted, getAudio]);

  // 停止音效
  const stop = useCallback((type: SoundType) => {
    const audio = audioRefs.current.get(type);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  // 停止所有音效
  const stopAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  // 静音切换
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(MUTE_STORAGE_KEY, String(newValue));
      }
      if (newValue) {
        audioRefs.current.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }
      return newValue;
    });
  }, []);

  return {
    play,
    stop,
    stopAll,
    toggleMute,
    isMuted,
  };
}

export type { SoundType };
