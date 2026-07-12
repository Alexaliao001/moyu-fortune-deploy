// 离线存储工具 - 使用 IndexedDB 存储运势记录

const DB_NAME = 'moyu-fortune-offline';
const DB_VERSION = 1;
const STORE_NAME = 'fortune-records';
const MAX_RECORDS = 50; // 最多存储50条记录

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
  synced: boolean; // 是否已同步到服务器
}

// 打开数据库
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

// 保存运势记录到本地
export async function saveFortuneOffline(record: Omit<FortuneRecord, 'id' | 'timestamp' | 'synced'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const newRecord: FortuneRecord = {
      ...record,
      timestamp: Date.now(),
      synced: navigator.onLine, // 如果在线，标记为已同步
    };

    store.add(newRecord);

    // 清理旧记录，保持最多 MAX_RECORDS 条
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const count = countRequest.result;
      if (count > MAX_RECORDS) {
        const deleteCount = count - MAX_RECORDS;
        const cursorRequest = store.index('timestamp').openCursor();
        let deleted = 0;
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && deleted < deleteCount) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          }
        };
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error('保存离线记录失败:', error);
  }
}

// 获取所有离线运势记录
export async function getOfflineRecords(): Promise<FortuneRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        // 按时间倒序排列
        const records = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('获取离线记录失败:', error);
    return [];
  }
}

// 获取最近的运势记录（用于离线显示）
export async function getRecentOfflineRecords(limit: number = 10): Promise<FortuneRecord[]> {
  const records = await getOfflineRecords();
  return records.slice(0, limit);
}

// 标记记录为已同步
export async function markRecordsSynced(ids: number[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const id of ids) {
      const request = store.get(id);
      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          record.synced = true;
          store.put(record);
        }
      };
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error('标记同步状态失败:', error);
  }
}

// 获取未同步的记录
export async function getUnsyncedRecords(): Promise<FortuneRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('获取未同步记录失败:', error);
    return [];
  }
}

// 清除所有离线数据
export async function clearOfflineData(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error('清除离线数据失败:', error);
  }
}

// 检查是否离线
export function isOffline(): boolean {
  return !navigator.onLine;
}

// 监听网络状态变化
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
