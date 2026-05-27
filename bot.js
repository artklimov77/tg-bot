require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { getAvailableDates, book, formatDateRu } = require('./slots');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

const WELCOME_TEXT = `🐱 *Денежная игра «Кот Шрёдингера»*

Что на самом деле отделяет тебя от желаемого?

Это не просто мотивация на 1 вечер — это возможность подсмотреть свою слепую зону. Один пазл способен изменить угол твоего зрения.

*Что даёт игра:*
• Увидишь свои слепые зоны роста
• Войдёшь в отличное состояние и настроение

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

  const buttons = dates.slice(0, 7).map(({ date, key, morning, evening }) => {
    const label = formatDateRu(date);
    const parts = [];
    if (morning) parts.push(Markup.button.callback(`${label} — утро 🌅`, `slot_${key}_morning`));
    if (evening) parts.push(Markup.button.callback(`${label} — вечер 🌙`, `slot_${key}_evening`));
    return parts;
  });

  await ctx.reply(
    'Выбери удобное время:',
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/^slot_(.+)_(morning|evening)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const dateKey = ctx.match[1];
  const period = ctx.match[2];
  const slotKey = `${dateKey}_${period}`;

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
  const timeStr = period === 'morning' ? 'утро 🌅' : 'вечер 🌙';

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
