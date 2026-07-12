import { useState, useEffect, useCallback } from 'react';
import { 
  saveFortuneOffline, 
  getRecentOfflineRecords, 
  isOffline as checkOffline,
  onNetworkChange 
} from '@/lib/offlineStorage';

interface FortuneRecord {
  id?: number;
  date: string;
  level: string;
  emoji: string;
  percent: number;
  message: string;
  suggestedTime: string;
  avatar: string;
  timestamp: number;
  synced: boolean;
}

interface UseOfflineReturn {
  isOffline: boolean;
  offlineRecords: FortuneRecord[];
  saveRecord: (record: Omit<FortuneRecord, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  refreshOfflineRecords: () => Promise<void>;
}

export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState(checkOffline());
  const [offlineRecords, setOfflineRecords] = useState<FortuneRecord[]>([]);

  // 监听网络状态变化
  useEffect(() => {
    const unsubscribe = onNetworkChange((online) => {
      setIsOffline(!online);
    });

    return unsubscribe;
  }, []);

  // 加载离线记录
  const refreshOfflineRecords = useCallback(async () => {
    try {
      const records = await getRecentOfflineRecords(20);
      setOfflineRecords(records);
    } catch (error) {
      console.error('加载离线记录失败:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refreshOfflineRecords();
  }, [refreshOfflineRecords]);

  // 保存记录
  const saveRecord = useCallback(async (record: Omit<FortuneRecord, 'id' | 'timestamp' | 'synced'>) => {
    await saveFortuneOffline(record);
    await refreshOfflineRecords();
  }, [refreshOfflineRecords]);

  return {
    isOffline,
    offlineRecords,
    saveRecord,
    refreshOfflineRecords,
  };
}
