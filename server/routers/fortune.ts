import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// 备用文案库（当LLM调用失败时使用）- 每个等级20条 - 中文
// 新增反内卷、裁员焦虑、通缩幽默系列
const FALLBACK_MESSAGES_ZH: Record<string, string[]> = {
  大吉: [
    // 原有金句
    "今天画的饼够我撑到下个世纪了，先摸为敬。",
    "老板今天不在线，我的摸鱼时间无上限！",
    "今天适合带薪发呆，顺便思考人生。",
    "工位就是我的养老院，今天继续躺平。",
    "今天的KPI就是不被发现在摸鱼。",
    "大吉大利，今天摸鱼！老板看不见我~",
    "运势爆棚，今天可以光明正大地带薪拉屎。",
    "今天适合整顿职场，从摸鱼开始。",
    "摸鱼体力槽已满，今天可以肆无忌惮！",
    "今天的工作状态：已读不回，精神离职。",
    // 反内卷系列
    "卷不动了？那就躺平吧，地球不会因为你多加班而转得更快。",
    "内卷的尽头是摸鱼，今天我已经到达终点。",
    "别人在卷，我在摸，这就是人生的参差。",
    "今天的反内卷宣言：我不是不努力，我是在保护自己。",
    "内卷是别人的事，摸鱼是我的修行。",
    // 裁员焦虑系列
    "今天还没被裁，说明你还有价值，去摸个鱼奖励自己。",
    "裁员名单上没有我，今天可以放心摸鱼。",
    "与其焦虑被裁，不如享受当下的摸鱼时光。",
    // 通缩幽默系列
    "工资不涨物价不涨，唯一涨的是我的摸鱼技能。",
    "经济下行，摸鱼上行，这就是平衡。",
  ],
  中吉: [
    // 原有金句
    "需求又改了？没事，我的心已经和代码一样，死了。",
    "今天适合用「在对齐」来回复所有消息。",
    "灵魂已经下班，肉体还在工位。",
    "今天的效率：用1小时完成10分钟的工作。",
    "建议今天把所有会议都标记为「可选参加」。",
    "中吉运势，今天摸鱼有保障，但要低调。",
    "今天适合打开PPT假装在做汇报。",
    "运势不错，可以适当延长带薪拉屎时间。",
    "今天的状态：人在工位，心在度假。",
    "中吉加持，今天可以合理摸鱼2小时。",
    // 反内卷系列
    "老板的饼画得再大，也不如你的午觉香。",
    "今天适合用「在思考战略方向」来掩护摸鱼。",
    "内卷是一种病，摸鱼是一种药。",
    "今天的反内卷策略：假装很忙，实际很闲。",
    "别人996，我965，这就是生活的智慧。",
    // 裁员焦虑系列
    "被裁了有N+1，不被裁有摸鱼，怎么都不亏。",
    "今天的安全感来自：我的工位还在。",
    // 通缩幽默系列
    "消费降级，摸鱼升级，这就是打工人的自我调节。",
    "经济不好，心情要好，摸鱼不能少。",
    "通缩时代，摸鱼是最好的投资。",
  ],
  小吉: [
    // 原有金句
    "工作量和薪水之间，总有一个在摸鱼。",
    "今天适合打开Excel假装在做数据分析。",
    "建议今天用「网络不好」来逃避视频会议。",
    "今天可以名正言顺地说在等需求。",
    "适合戴上耳机假装在开会。",
    "小吉运势，今天摸鱼要见机行事。",
    "今天的摸鱼策略：小摸怡情，大摸伤身。",
    "运势小吉，建议把摸鱼时间控制在1小时内。",
    "今天适合用「在review代码」来争取摸鱼时间。",
    "小吉加持，今天可以适度带薪发呆。",
    // 反内卷系列
    "今天适合用「在拉通对齐」来拖延工作。",
    "内卷不是我的错，是这个时代的错。",
    "今天的反内卷姿势：坐着摸鱼，躺着思考。",
    "卷王们在冲刺，我在原地休息。",
    // 裁员焦虑系列
    "今天还能摸鱼，说明公司还养得起我。",
    "裁员潮中的幸存者，今天值得摸一摸。",
    // 通缩幽默系列
    "工资没涨，但摸鱼技能涨了，这也是一种增值。",
    "经济寒冬，摸鱼取暖。",
    "物价不涨，摸鱼不止。",
    "通缩时代的生存法则：少花钱，多摸鱼。",
  ],
  末吉: [
    // 原有金句
    "今天的工作状态：人在工位心在家。",
    "适合用「收到，稍后处理」拖到下班。",
    "今天适合研究公司零食柜的库存。",
    "建议今天开会时打开摄像头但关闭大脑。",
    "今天可以多喝几杯水，顺便多上几次厕所。",
    "末吉运势，今天摸鱼要格外小心。",
    "今天的摸鱼策略：打游击战，速战速决。",
    "运势末吉，建议把摸鱼时间控制在30分钟内。",
    "今天适合假装在整理桌面文件。",
    "末吉加持，今天摸鱼要眼观六路耳听八方。",
    // 反内卷系列
    "今天不适合反内卷，先苟着。",
    "内卷大军压境，今天低调行事。",
    "今天的策略：表面内卷，内心躺平。",
    // 裁员焦虑系列
    "今天适合表现得积极一点，毕竟裁员季还没过。",
    "末吉运势，今天最好让老板看到你在工作。",
    "裁员阴影下，今天摸鱼要谨慎。",
    // 通缩幽默系列
    "经济不好，工作要保，今天少摸一点。",
    "通缩时代，饭碗要稳，摸鱼要轻。",
    "今天的生存法则：假装很忙，实际很慌。",
    "末吉提醒：摸鱼有风险，入坑需谨慎。",
  ],
  凶: [
    // 原有金句
    "今天老板眼神不太对，建议低调行事。",
    "摸鱼需谨慎，今天适合假装很忙。",
    "今天的运势提醒你：打开工作文档，假装在思考。",
    "建议今天把摸鱼时间控制在厕所里。",
    "今天适合假装在等需求，实际在等下班。",
    "凶！今天不宜摸鱼，建议认真工作一天。",
    "运势不佳，今天摸鱼容易被抓包。",
    "今天的摸鱼策略：能不摸就不摸。",
    "凶运当头，建议今天把工作当主业。",
    "今天适合把摸鱼的心思用在工作上。",
    // 反内卷系列
    "今天不是反内卷的日子，先卷一卷保平安。",
    "内卷一天不会死，但今天不卷可能会被盯上。",
    "今天的反内卷策略：暂停，明天再说。",
    // 裁员焦虑系列
    "凶运当头，今天最好表现得像个卷王。",
    "裁员名单可能正在拟定，今天别摸了。",
    "今天适合主动汇报工作进度，刷刷存在感。",
    // 通缩幽默系列
    "经济寒冬+凶运，今天老老实实干活吧。",
    "通缩时代保住饭碗最重要，今天别作死。",
    "今天的生存法则：低调做人，高调做事。",
    "凶运提醒：工作不努力，明天找工作。",
  ],
};

// 备用文案库 - 英文（增加反内卷系列）
const FALLBACK_MESSAGES_EN: Record<string, string[]> = {
  大吉: [
    "Boss is MIA today, time to slack like a pro!",
    "Your slacking energy is off the charts today!",
    "Perfect day for a paid daydreaming session.",
    "Today's productivity: Looking busy while doing nothing.",
    "Your desk is now officially a relaxation station.",
    "Great luck! Time to master the art of looking busy.",
    "Today's KPI: Successfully avoid all actual work.",
    "Your slacking powers are at maximum capacity!",
    "Perfect day to let your soul clock out early.",
    "Today you can slack with zero consequences!",
    // Anti-hustle culture series
    "Hustle culture is dead, long live slack culture!",
    "They're grinding, I'm chilling. This is the way.",
    "Today's anti-hustle mantra: Work smarter, slack harder.",
    "The grind can wait, your mental health can't.",
    "Quiet quitting? I call it loud thriving.",
    // Layoff anxiety series
    "Still employed? Celebrate with some quality slacking!",
    "Not on the layoff list today = permission to slack.",
    // Economic humor series
    "Economy's down, slacking's up. Balance achieved.",
    "In this economy, slacking is self-care.",
    "Inflation can't touch my slacking skills.",
  ],
  中吉: [
    "Good luck today! Slack moderately and prosper.",
    "Your slacking window is open, use it wisely.",
    "Today's vibe: Body at desk, mind on vacation.",
    "Good fortune for strategic bathroom breaks.",
    "Time to perfect your 'deep in thought' face.",
    "Today you can slack with reasonable confidence.",
    "Your luck supports 2 hours of quality slacking.",
    "Good day to master the 'network issues' excuse.",
    "Today's efficiency: Maximum slack, minimum detection.",
    "Your slacking energy is well-balanced today.",
    // Anti-hustle culture series
    "Boss's promises are big, but your nap is bigger.",
    "Today's strategy: Look busy, stay chill.",
    "Hustle culture is a disease, slacking is the cure.",
    "Others are burning out, you're chilling out.",
    // Layoff anxiety series
    "Survived another round of layoffs? Time to slack!",
    "Your job security today = your slacking permit.",
    // Economic humor series
    "Recession-proof skill: Professional slacking.",
    "Economy's rough, but your slacking game is smooth.",
    "In tough times, slack is the best investment.",
    "Salary frozen, slacking skills on fire.",
  ],
  小吉: [
    "Fair luck today, slack with caution.",
    "Your slacking window is small but usable.",
    "Today's strategy: Quick slacks, fast recovery.",
    "Time to perfect the 'waiting for feedback' excuse.",
    "Fair fortune for brief mental vacations.",
    "Today you can slack, but stay alert.",
    "Your luck supports 1 hour of careful slacking.",
    "Good day to master the 'reviewing code' cover.",
    "Today's vibe: Slack when opportunity knocks.",
    "Your slacking energy needs strategic deployment.",
    // Anti-hustle culture series
    "Today's anti-hustle move: Strategic procrastination.",
    "The grind is real, but so is your need for rest.",
    "Hustle bros are sprinting, you're pacing yourself.",
    // Layoff anxiety series
    "Still here? That's worth a small celebration slack.",
    "Job market's tough, but you're tougher. Small slack earned.",
    // Economic humor series
    "Salary didn't grow, but slacking skills did.",
    "Economic winter calls for slacking warmth.",
    "Prices stable, slacking stable. Life is good.",
    "Downgrade spending, upgrade slacking.",
    "In deflation, slacking is the real currency.",
  ],
  末吉: [
    "Luck is thin today, slack at your own risk.",
    "Your slacking window is barely cracked open.",
    "Today's strategy: Quick glances, fast alt-tabs.",
    "Time to perfect the 'compiling code' excuse.",
    "Minimal fortune for very brief breaks.",
    "Today you should probably look busy.",
    "Your luck supports only 30 mins of slacking.",
    "Good day to actually pretend to work.",
    "Today's vibe: Stay vigilant, slack minimally.",
    "Your slacking energy is running low.",
    // Anti-hustle culture series
    "Today's not the day to fight hustle culture.",
    "Anti-hustle on pause, survival mode on.",
    "Look busy on the outside, chill on the inside.",
    // Layoff anxiety series
    "Layoff season vibes, better look productive today.",
    "Show some hustle today, slack tomorrow.",
    "Today's survival tip: Be visible, look valuable.",
    // Economic humor series
    "Tough times call for careful slacking.",
    "Economy's shaky, job's precious. Slack lightly.",
    "Today's motto: Fake busy, stay employed.",
    "Minor luck says: Work now, slack later.",
  ],
  凶: [
    "Bad luck! Today is not for slacking.",
    "Your slacking radar is completely offline.",
    "Today's strategy: Actually do some work.",
    "Time to look genuinely productive.",
    "No fortune for slacking today, sorry!",
    "Today you should definitely work hard.",
    "Your luck says: Zero slacking allowed.",
    "Bad day to test your boss's patience.",
    "Today's vibe: Head down, work mode on.",
    "Your slacking energy has been depleted.",
    // Anti-hustle culture series
    "Today's not anti-hustle day. Just hustle.",
    "One day of hustle won't kill you. Probably.",
    "Anti-hustle movement on hold. Resume tomorrow.",
    // Layoff anxiety series
    "Bad luck + layoff season = work hard today.",
    "Today's survival mode: Look like a top performer.",
    "The layoff list might be updating. Look busy!",
    // Economic humor series
    "Economic winter + bad luck = actually work.",
    "In this economy, keep your job. Work today.",
    "Today's rule: Low profile, high output.",
    "Bad fortune reminder: No job, no slack.",
  ],
};

// 从LLM响应中提取最终金句
function extractSlogan(content: string, isEnglish: boolean): string {
  // 如果内容很短（小于100字符），直接返回
  if (content.length < 100) {
    return content.trim();
  }

  // 尝试提取JSON格式的slogan
  try {
    const jsonMatch = content.match(/\{[\s\S]*"slogan"\s*:\s*"([^"]+)"[\s\S]*\}/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
  } catch {
    // 忽略JSON解析错误
  }

  // 尝试提取 *Final Choice:* 或 **Final Choice:** 后面的内容
  const finalChoiceMatch = content.match(/\*+Final Choice:?\*+\s*(.+?)(?:\s*\(|$)/i);
  if (finalChoiceMatch && finalChoiceMatch[1]) {
    return finalChoiceMatch[1].trim();
  }

  if (isEnglish) {
    // 英文：尝试提取最后一行有意义的内容
    const lines = content.split('\n').filter(line => line.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      // 检查是否是英文短句（20-80字符）
      if (line.length >= 20 && line.length <= 80 && /[a-zA-Z]/.test(line)) {
        return line.replace(/^\*+|\*+$/g, '').replace(/^["']|["']$/g, '').trim();
      }
    }
  } else {
    // 中文：尝试提取最后一行中文内容
    const lines = content.split('\n').filter(line => line.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      // 检查是否是中文为主的短句（20-50字符）
      const chineseMatch = line.match(/[\u4e00-\u9fa5，。！？、]+/g);
      if (chineseMatch) {
        const chineseText = chineseMatch.join('');
        if (chineseText.length >= 15 && chineseText.length <= 60) {
          // 清理可能的标记
          return line.replace(/^\*+|\*+$/g, '').replace(/^[「」【】]/g, '').trim();
        }
      }
    }
  }

  // 如果都没找到，返回前50个字符
  return content.slice(0, 50).trim();
}

export const fortuneRouter = router({
  // 生成00后职场黑话风格文案
  generateSlogan: publicProcedure
    .input(
      z.object({
        level: z.string(), // 运势等级：大吉、中吉、小吉、末吉、凶
        percent: z.number(), // 摸鱼指数百分比
        language: z.enum(['zh', 'en']).optional().default('zh'), // 语言
      })
    )
    .mutation(async ({ input }) => {
      const { level, percent, language } = input;
      const isEnglish = language === 'en';
      const FALLBACK_MESSAGES = isEnglish ? FALLBACK_MESSAGES_EN : FALLBACK_MESSAGES_ZH;

      try {
        // 根据语言选择不同的prompt - 增加反内卷、裁员焦虑、通缩幽默主题
        const systemPrompt = isEnglish
          ? `You are a witty office slacking fortune generator. Output ONLY one short, funny slogan (20-60 characters) about slacking at work.

Style: Use Gen-Z office humor, memes, corporate buzzwords mockery. Be sarcastic and relatable.
Themes to include: Anti-hustle culture, quiet quitting, layoff anxiety humor, economic downturn jokes, work-life balance rebellion.

Fortune mood:
- Great Luck (大吉): Super happy, slack freely, no consequences
- Good Luck (中吉): Nice, can slack moderately with confidence  
- Fair Luck (小吉): Okay, slack carefully, stay alert
- Minor Luck (末吉): Meh, be very careful, minimal slacking
- Bad Luck (凶): Don't slack, actually work today`
          : `你是摸鱼金句生成器。只输出一句20-40字的00后职场黑话风格金句，不要任何解释。

风格要求：使用摆烂、躺平、画饼、带薪拉屎、精神离职、工位养老、整顿职场、对齐颗粒度、拉通对齐、赋能、抓手等职场梗。
主题方向：反内卷、裁员焦虑调侃、通缩幽默、打工人自嘲、职场生存智慧。

运势情绪：
- 大吉：超开心，放心摸，可以肆无忌惮
- 中吉：不错，有保障，可以适度摸鱼
- 小吉：还行，适度摸，要见机行事
- 末吉：一般，小心点，要格外谨慎
- 凶：不行，要低调，最好别摸`;

        const levelMap: Record<string, string> = {
          '大吉': 'Great Luck',
          '中吉': 'Good Luck',
          '小吉': 'Fair Luck',
          '末吉': 'Minor Luck',
          '凶': 'Bad Luck',
        };

        const userPrompt = isEnglish
          ? `Fortune: ${levelMap[level] || level}, Index: ${percent}%. Output slogan:`
          : `运势：${level}，指数${percent}%。输出金句：`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const content = result.choices[0]?.message?.content;
        if (typeof content === "string" && content.trim().length > 0) {
          // 提取最终金句
          const slogan = extractSlogan(content, isEnglish);
          
          // 如果提取的金句太长或太短，使用备用文案
          if (slogan.length < 10 || slogan.length > 80) {
            const fallbacks = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["小吉"];
            const randomSlogan = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            return {
              success: true,
              slogan: randomSlogan,
              source: "fallback",
            };
          }
          
          return {
            success: true,
            slogan: slogan,
            source: "ai",
          };
        }

        // 如果LLM返回空内容，使用备用文案
        const fallbacks = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["小吉"];
        const randomSlogan = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return {
          success: true,
          slogan: randomSlogan,
          source: "fallback",
        };
      } catch (error) {
        console.error("LLM调用失败:", error);
        // 调用失败时使用备用文案
        const fallbacks = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["小吉"];
        const randomSlogan = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return {
          success: true,
          slogan: randomSlogan,
          source: "fallback",
        };
      }
    }),
});
