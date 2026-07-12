import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';
import { useTranslation } from 'react-i18next';
import { Flame, Star, Users, Dices, BarChart3, Calendar, Smile, Moon, Inbox } from 'lucide-react';

type Tab = 'streak' | 'weekly';

// 排名奖牌 - 统一金色风格
function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; text: string; border: string; shadow: string }> = {
    1: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#5A3A10', border: 'rgba(255,215,0,0.6)', shadow: '0 2px 8px rgba(255,180,50,0.4)' },
    2: { bg: 'linear-gradient(135deg, #E8E8E8 0%, #B0B0B0 100%)', text: '#3A3A3A', border: 'rgba(200,200,200,0.6)', shadow: '0 2px 8px rgba(180,180,180,0.3)' },
    3: { bg: 'linear-gradient(135deg, #E8A060 0%, #CD7F32 100%)', text: '#4A2A10', border: 'rgba(205,127,50,0.6)', shadow: '0 2px 8px rgba(205,127,50,0.3)' },
  };
  const c = colors[rank];
  if (c) {
    return (
      <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-black"
        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, boxShadow: c.shadow }}>
        {rank}
      </span>
    );
  }
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
      {rank}
    </span>
  );
}

// 运势等级颜色
function getLevelColor(level: string): string {
  switch (level) {
    case '大吉': return '#fbbf24';
    case '中吉': return '#fb923c';
    case '小吉': return '#a78bfa';
    case '末吉': return '#60a5fa';
    case '凶': return '#6b7280';
    default: return '#9ca3af';
  }
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>('streak');
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en' || i18n.language.startsWith('en');

  const { data: streakData, isLoading: streakLoading } = trpc.leaderboard.streakRanking.useQuery({ limit: 30 });
  const { data: weeklyData, isLoading: weeklyLoading } = trpc.leaderboard.weeklyBestRanking.useQuery({ limit: 30 });
  const { data: myData } = trpc.leaderboard.myRanking.useQuery(undefined, { enabled: true });
  const { data: globalStats } = trpc.leaderboard.globalStats.useQuery();

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'streak', label: isEn ? 'Streak Kings' : '连续签到榜', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'weekly', label: isEn ? 'Weekly Best' : '本周最佳榜', icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <PageLayout title={isEn ? 'Leaderboard' : '排行榜'}>
      <div className="space-y-4 animate-fadeIn">
        {/* 我的排名卡片 */}
        {user && myData && (
          <GlassCard accent="gold" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(255,180,50,0.3), rgba(255,120,30,0.2))' }}>
                <Smile className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-white/90 font-display text-sm">{isEn ? 'My Stats' : '我的战绩'}</div>
                <div className="text-white/40 text-xs">{user.name || (isEn ? 'Slacker' : '摸鱼达人')}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-xl font-bold" style={{ color: '#fbbf24' }}>
                  {myData.streak}
                </div>
                <div className="text-white/40 text-[10px] mt-0.5">{isEn ? 'Day Streak' : '连续签到'}</div>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-xl font-bold" style={{ color: myData.weeklyBest ? getLevelColor(myData.weeklyBest.level) : '#6b7280' }}>
                  {myData.weeklyBest?.level ? (isEn ? ({'大吉':'Great','中吉':'Good','小吉':'Fair','末吉':'Minor','平':'Neutral','小凶':'Minor Bad','凶':'Bad'} as Record<string, string>)[myData.weeklyBest.level] || myData.weeklyBest.level : myData.weeklyBest.level) : (isEn ? '-' : '—')}
                </div>
                <div className="text-white/40 text-[10px] mt-0.5">{isEn ? 'Weekly Best' : '本周最佳'}</div>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-xl font-bold text-white/80">
                  {myData.totalDraws}
                </div>
                <div className="text-white/40 text-[10px] mt-0.5">{isEn ? 'Total Draws' : '总抽签数'}</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 全站统计 */}
        {globalStats && (
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-1.5 text-white/30 text-xs">
              <Users className="w-3 h-3" />
              <span>{globalStats.totalUsers} {isEn ? 'users' : '用户'}</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center gap-1.5 text-white/30 text-xs">
              <Dices className="w-3 h-3" />
              <span>{globalStats.totalDraws} {isEn ? 'draws' : '次抽签'}</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center gap-1.5 text-white/30 text-xs">
              <BarChart3 className="w-3 h-3" />
              <span>{isEn ? 'Avg' : '平均'} {globalStats.avgPercent}%</span>
            </div>
          </div>
        )}

        {/* Tab切换 */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5"
              style={{
                background: activeTab === tab.key ? 'rgba(255,180,50,0.2)' : 'transparent',
                color: activeTab === tab.key ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(255,150,30,0.15)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 排行榜列表 */}
        <GlassCard accent="none" className="overflow-hidden">
          {activeTab === 'streak' ? (
            <StreakList 
              rankings={streakData?.rankings || []} 
              isLoading={streakLoading}
              currentUserId={user?.id}
              isEn={isEn}
            />
          ) : (
            <WeeklyList 
              rankings={weeklyData?.rankings || []} 
              isLoading={weeklyLoading}
              weekRange={weeklyData?.weekRange}
              currentUserId={user?.id}
              isEn={isEn}
            />
          )}
        </GlassCard>

        {/* 底部说明 */}
        <div className="text-center text-white/20 text-[10px] py-2">
          {isEn 
            ? 'Rankings update in real-time. Keep slacking to climb!'
            : '排行榜实时更新，坚持摸鱼就能上榜！'
          }
        </div>
      </div>
    </PageLayout>
  );
}

// 连续签到排行列表
function StreakList({ rankings, isLoading, currentUserId, isEn }: {
  rankings: any[];
  isLoading: boolean;
  currentUserId?: number;
  isEn: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full mx-auto" />
        <div className="text-white/30 text-xs mt-3">{isEn ? 'Loading...' : '加载中...'}</div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="p-8 text-center">
        <Inbox className="w-8 h-8 text-white/20 mb-2 mx-auto" />
        <div className="text-white/40 text-sm">{isEn ? 'No data yet' : '暂无数据'}</div>
        <div className="text-white/20 text-xs mt-1">{isEn ? 'Be the first to start a streak!' : '成为第一个连续签到的人！'}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 表头 */}
      <div className="flex items-center px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-wider"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-10">#</div>
        <div className="flex-1">{isEn ? 'Player' : '玩家'}</div>
        <div className="w-20 text-center flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> {isEn ? 'Streak' : '连续'}</div>
      </div>

      {/* 列表 */}
      {rankings.map((item, index) => {
        const isMe = currentUserId === item.userId;
        return (
          <div
            key={item.userId}
            className="flex items-center px-4 py-3 transition-colors"
            style={{
              background: isMe ? 'rgba(255,180,50,0.08)' : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div className="w-10 flex-shrink-0">
              <RankBadge rank={item.rank} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/80 text-sm truncate">
                {item.name}
                {isMe && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" 
                  style={{ background: 'rgba(255,180,50,0.2)', color: '#fbbf24' }}>
                  {isEn ? 'ME' : '我'}
                </span>}
              </div>
            </div>
            <div className="w-20 text-center">
              <span className="text-lg font-bold" style={{ 
                color: item.rank <= 3 ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                textShadow: item.rank <= 3 ? '0 0 12px rgba(255,180,50,0.3)' : 'none',
              }}>
                {item.streak}
              </span>
              <span className="text-white/30 text-[10px] ml-0.5">{isEn ? 'd' : '天'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 本周最佳运势排行列表
function WeeklyList({ rankings, isLoading, weekRange, currentUserId, isEn }: {
  rankings: any[];
  isLoading: boolean;
  weekRange?: { start: string; end: string } | null;
  currentUserId?: number;
  isEn: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full mx-auto" />
        <div className="text-white/30 text-xs mt-3">{isEn ? 'Loading...' : '加载中...'}</div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="p-8 text-center">
        <Moon className="w-8 h-8 text-white/20 mb-2 mx-auto" />
        <div className="text-white/40 text-sm">{isEn ? 'No draws this week' : '本周暂无抽签'}</div>
        <div className="text-white/20 text-xs mt-1">{isEn ? 'Be the first to draw this week!' : '成为本周第一个抽签的人！'}</div>
      </div>
    );
  }

  // 格式化周范围
  const formatWeekRange = () => {
    if (!weekRange) return '';
    const start = new Date(weekRange.start);
    const end = new Date(weekRange.end);
    if (isEn) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  return (
    <div>
      {/* 周范围 */}
      {weekRange && (
        <div className="px-4 py-2 text-center text-white/25 text-[10px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatWeekRange()}</span>
        </div>
      )}

      {/* 表头 */}
      <div className="flex items-center px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-wider"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-10">#</div>
        <div className="flex-1">{isEn ? 'Player' : '玩家'}</div>
        <div className="w-16 text-center">{isEn ? 'Best' : '最佳'}</div>
        <div className="w-14 text-center">{isEn ? 'Index' : '指数'}</div>
      </div>

      {/* 列表 */}
      {rankings.map((item, index) => {
        const isMe = currentUserId === item.userId;
        const levelColor = getLevelColor(item.bestLevel);
        return (
          <div
            key={item.userId}
            className="flex items-center px-4 py-3 transition-colors"
            style={{
              background: isMe ? 'rgba(255,180,50,0.08)' : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div className="w-10 flex-shrink-0">
              <RankBadge rank={item.rank} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/80 text-sm truncate">
                {item.name}
                {isMe && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" 
                  style={{ background: 'rgba(255,180,50,0.2)', color: '#fbbf24' }}>
                  {isEn ? 'ME' : '我'}
                </span>}
              </div>
              <div className="text-white/25 text-[10px] mt-0.5">
                {item.totalDraws} {isEn ? 'draws' : '次抽签'}
              </div>
            </div>
            <div className="w-16 text-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ 
                  background: `${levelColor}20`,
                  color: levelColor,
                }}>
                {isEn ? ({'大吉':'Great','中吉':'Good','小吉':'Fair','末吉':'Minor','平':'Neutral','小凶':'Minor Bad','凶':'Bad'} as Record<string, string>)[item.bestLevel] || item.bestLevel : item.bestLevel}
              </span>
            </div>
            <div className="w-14 text-center">
              <span className="text-sm font-bold" style={{ color: levelColor }}>
                {item.bestPercent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
