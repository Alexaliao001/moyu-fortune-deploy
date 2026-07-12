import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== 摸鱼运势 数据分析报告 ===\n");

// 1. 用户总数
const [users] = await conn.query("SELECT COUNT(*) as total FROM users");
console.log(`📊 用户总数: ${users[0].total}`);

// 2. 按天注册趋势
const [regTrend] = await conn.query(`
  SELECT DATE(createdAt) as reg_date, COUNT(*) as new_users 
  FROM users 
  GROUP BY DATE(createdAt) 
  ORDER BY reg_date DESC 
  LIMIT 30
`);
console.log("\n📈 每日新增用户（最近30天）:");
regTrend.forEach(r => console.log(`  ${r.reg_date} → ${r.new_users}人`));

// 3. 角色分布
const [roles] = await conn.query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
console.log("\n👥 用户角色分布:");
roles.forEach(r => console.log(`  ${r.role}: ${r.count}`));

// 4. 抽签总数
const [draws] = await conn.query("SELECT COUNT(*) as total FROM fortune_history");
console.log(`\n🎰 总抽签次数: ${draws[0].total}`);

// 5. 每日抽签趋势
const [drawTrend] = await conn.query(`
  SELECT DATE(createdAt) as draw_date, COUNT(*) as draws, COUNT(DISTINCT userId) as unique_users
  FROM fortune_history 
  GROUP BY DATE(createdAt) 
  ORDER BY draw_date DESC 
  LIMIT 30
`);
console.log("\n📈 每日抽签数据（最近30天）:");
drawTrend.forEach(r => console.log(`  ${r.draw_date} → ${r.draws}次抽签, ${r.unique_users}个独立用户`));

// 6. 运势分布
const [levels] = await conn.query(`
  SELECT level, COUNT(*) as count, 
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM fortune_history), 1) as pct
  FROM fortune_history 
  GROUP BY level 
  ORDER BY count DESC
`);
console.log("\n🎯 运势等级分布:");
levels.forEach(r => console.log(`  ${r.level}: ${r.count}次 (${r.pct}%)`));

// 7. 订阅/付费数据
const [subs] = await conn.query("SELECT status, plan, COUNT(*) as count FROM subscriptions GROUP BY status, plan");
console.log("\n💰 订阅数据:");
if (subs.length === 0) console.log("  暂无订阅记录");
else subs.forEach(r => console.log(`  ${r.plan} (${r.status}): ${r.count}`));

// 8. 单次购买数据
const [purchases] = await conn.query("SELECT productType, status, COUNT(*) as count FROM purchases GROUP BY productType, status");
console.log("\n🛒 单次购买数据:");
if (purchases.length === 0) console.log("  暂无购买记录");
else purchases.forEach(r => console.log(`  ${r.productType} (${r.status}): ${r.count}`));

// 9. 邀请数据
const [invites] = await conn.query("SELECT COUNT(*) as total, SUM(rewardClaimed) as claimed FROM invitations");
console.log(`\n🎁 邀请数据: 总邀请${invites[0].total}次, 已领奖${invites[0].claimed || 0}次`);

// 10. 反馈数据
const [fb] = await conn.query("SELECT type, status, COUNT(*) as count FROM feedback GROUP BY type, status");
console.log("\n💬 用户反馈:");
if (fb.length === 0) console.log("  暂无反馈");
else fb.forEach(r => console.log(`  ${r.type} (${r.status}): ${r.count}`));

// 11. 用户留存分析 - 注册后有多少人第二天还抽签
const [retention] = await conn.query(`
  SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN f.createdAt >= DATE_ADD(u.createdAt, INTERVAL 1 DAY) THEN u.id END) as day2_retained,
    COUNT(DISTINCT CASE WHEN f.createdAt >= DATE_ADD(u.createdAt, INTERVAL 7 DAY) THEN u.id END) as day7_retained
  FROM users u
  LEFT JOIN fortune_history f ON u.id = f.userId
  WHERE u.createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
`);
if (retention[0].total_users > 0) {
  console.log(`\n📊 留存率分析（注册超过7天的用户）:`);
  console.log(`  总用户: ${retention[0].total_users}`);
  console.log(`  次日留存: ${retention[0].day2_retained} (${(retention[0].day2_retained/retention[0].total_users*100).toFixed(1)}%)`);
  console.log(`  7日留存: ${retention[0].day7_retained} (${(retention[0].day7_retained/retention[0].total_users*100).toFixed(1)}%)`);
}

// 12. 人均抽签次数
const [avgDraws] = await conn.query(`
  SELECT 
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT userId), 1) as avg_draws_per_user,
    MAX(user_draws) as max_draws
  FROM fortune_history,
  (SELECT userId as uid, COUNT(*) as user_draws FROM fortune_history GROUP BY userId) sub
`);
console.log(`\n📊 人均抽签: ${avgDraws[0].avg_draws_per_user}次, 最高: ${avgDraws[0].max_draws}次`);

// 13. 最活跃用户TOP10
const [topUsers] = await conn.query(`
  SELECT u.name, u.email, COUNT(f.id) as draws, MIN(f.createdAt) as first_draw, MAX(f.createdAt) as last_draw
  FROM users u 
  JOIN fortune_history f ON u.id = f.userId 
  GROUP BY u.id, u.name, u.email
  ORDER BY draws DESC 
  LIMIT 10
`);
console.log("\n🏆 最活跃用户TOP10:");
topUsers.forEach((r, i) => console.log(`  ${i+1}. ${r.name || '匿名'} (${r.email || '-'}) → ${r.draws}次抽签, 首次:${r.first_draw}, 最近:${r.last_draw}`));

// 14. 按小时分布（用户最活跃时间段）
const [hourly] = await conn.query(`
  SELECT HOUR(createdAt) as hour, COUNT(*) as draws
  FROM fortune_history
  GROUP BY HOUR(createdAt)
  ORDER BY hour
`);
console.log("\n⏰ 抽签时段分布（UTC时间）:");
hourly.forEach(r => {
  const bar = '█'.repeat(Math.ceil(r.draws / Math.max(...hourly.map(h => h.draws)) * 20));
  console.log(`  ${String(r.hour).padStart(2,'0')}:00 → ${bar} ${r.draws}`);
});

// 15. 通知数据
const [notifs] = await conn.query("SELECT type, isRead, COUNT(*) as count FROM notifications GROUP BY type, isRead");
console.log("\n🔔 通知数据:");
if (notifs.length === 0) console.log("  暂无通知");
else notifs.forEach(r => console.log(`  ${r.type} (${r.isRead ? '已读' : '未读'}): ${r.count}`));

await conn.end();
console.log("\n=== 分析完成 ===");
