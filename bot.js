require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { getAvailableDates, book, formatDateRu, slotLabel } = require('./slots');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

const WELCOME_TEXT = `🐱 *Денежная игра «Кот Шрёдингера»*

Что на самом деле отделяет тебя от желаемого?

Это не просто мотивация на 1 вечер — это возможность подсмотреть свою слепую зону. Один пазл способен изменить угол твоего зрения.

*Что даёт игра:*

1️⃣ Увидишь самые выгодные варианты из доступных, а также тупиковые

2️⃣ *Состояние*
• Расслабленная концентрация
• Снятие напряжения от неопределённости

3️⃣ *Усиление новых опор*
• Повышение устойчивости и уверенности
• Взгляд на себя со стороны

4️⃣ *Выявление слепых зон*
• Вытаскивает то, что не замечено
• Закрытые коробки: страхи и привычки, которые мешают

5️⃣ *Харизма и сильные стороны*
• Подчёркивает уникальность и супер-навыки
• Связь с интуицией

6️⃣ *Улучшение взаимоотношений* через глубокое самоузнавание

Это конкретный инструмент — здесь и сейчас 🎯

⏱ Длительность: 45 минут`;

bot.start((ctx) => {
  ctx.replyWithMarkdown(
    WELCOME_TEXT,
    Markup.inlineKeyboard([
      [Markup.button.callback('📅 Записаться', 'book')]
    ])
  );
});

bot.action('book', async (ctx) => {
  await ctx.answerCbQuery();
  const dates = getAvailableDates();

  if (dates.length === 0) {
    return ctx.reply('Свободных дат пока нет. Напиши мне напрямую, договоримся 🙏');
  }

  const buttons = dates.flatMap(({ date, key, slots }) => {
    const label = formatDateRu(date);
    return slots.map(slot =>
      [Markup.button.callback(`${label} — ${slotLabel(slot)}`, `slot_${key}_${slot}`)]
    );
  });

  await ctx.reply(
    'Выбери удобное время:',
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/^slot_(\d{4}-\d{2}-\d{2})_(\d{4})$/, async (ctx) => {
  await ctx.answerCbQuery();
  const dateKey = ctx.match[1];
  const slot = ctx.match[2];
  const slotKey = `${dateKey}_${slot}`;

  const user = ctx.from;
  const userName = user.username ? `@${user.username}` : user.first_name;

  const success = book(slotKey, user.id, userName);

  if (!success) {
    return ctx.reply('Этот слот уже занят. Выбери другое время 👇', Markup.inlineKeyboard([
      [Markup.button.callback('← Посмотреть другие даты', 'book')]
    ]));
  }

  const [year, month, day] = dateKey.split('-');
  const date = new Date(year, month - 1, day);
  const dateStr = formatDateRu(date);
  const timeStr = slotLabel(slot);

  await ctx.replyWithMarkdown(
    `✅ *Отлично, записала тебя!*\n\n📅 ${dateStr}, ${timeStr}\n⏱ 45 минут\n\nСкоро напишу тебе с деталями 🐱`
  );

  if (ADMIN_ID && ADMIN_ID !== 'your_telegram_chat_id_here') {
    const tgLink = user.username ? `@${user.username}` : user.first_name;
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `🔔 Новая запись!\n\nКлиент: ${tgLink}\nДата: ${dateStr}\nВремя: ${timeStr}`
    );
  }
});

bot.command('myid', (ctx) => {
  ctx.reply(`Твой Telegram ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.launch();
console.log('Бот запущен ✅');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
