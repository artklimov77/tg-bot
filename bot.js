require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const {
  getAvailableDates,
  getUserBooking,
  getAllUpcomingBookings,
  book,
  cancelBooking,
  formatDateRu,
  slotLabel,
  formatSlotKeyRu,
} = require('./slots');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

function isAdmin(ctx) {
  return String(ctx.from.id) === String(ADMIN_ID);
}

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

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('📅 Записаться', 'book')],
  [Markup.button.callback('📋 Моя запись', 'mybooking')],
]);

bot.start((ctx) => {
  ctx.replyWithMarkdown(WELCOME_TEXT, mainMenu);
});

bot.action('start', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithMarkdown(WELCOME_TEXT, mainMenu);
});

bot.action('book', async (ctx) => {
  await ctx.answerCbQuery();

  const existing = getUserBooking(ctx.from.id);
  if (existing) {
    return ctx.replyWithMarkdown(
      `У тебя уже есть запись: *${formatSlotKeyRu(existing.slotKey)}*\n\nХочешь отменить и выбрать другое время?`,
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отменить запись', `cancel_${existing.slotKey}`)],
        [Markup.button.callback('🏠 На главную', 'start')],
      ])
    );
  }

  const dates = getAvailableDates();
  if (dates.length === 0) {
    return ctx.reply('Свободных дат пока нет. Напиши мне напрямую, договоримся 🙏', mainMenu);
  }

  const buttons = dates.slice(0, 4).flatMap(({ date, key, slots }) => {
    const label = formatDateRu(date);
    const morning = slots.filter(s => s === '1000' || s === '1100');
    const evening = slots.filter(s => s === '1700' || s === '2000');
    const rows = [];
    if (morning.length) rows.push(morning.map(s => Markup.button.callback(`${label} ${slotLabel(s)}`, `slot_${key}_${s}`)));
    if (evening.length) rows.push(evening.map(s => Markup.button.callback(`${label} ${slotLabel(s)}`, `slot_${key}_${s}`)));
    return rows;
  });

  buttons.push([Markup.button.callback('🏠 На главную', 'start')]);

  await ctx.reply('Выбери удобное время:', Markup.inlineKeyboard(buttons));
});

bot.action('mybooking', async (ctx) => {
  await ctx.answerCbQuery();

  const existing = getUserBooking(ctx.from.id);
  if (!existing) {
    return ctx.reply('У тебя пока нет записей 🙂', mainMenu);
  }

  await ctx.replyWithMarkdown(
    `📋 *Твоя запись:*\n\n📅 ${formatSlotKeyRu(existing.slotKey)}\n⏱ 45 минут`,
    Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отменить запись', `cancel_${existing.slotKey}`)],
      [Markup.button.callback('🏠 На главную', 'start')],
    ])
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
      [Markup.button.callback('← Другие даты', 'book')],
    ]));
  }

  const [year, month, day] = dateKey.split('-');
  const date = new Date(year, month - 1, day);
  const dateStr = formatDateRu(date);
  const timeStr = slotLabel(slot);

  await ctx.replyWithMarkdown(
    `✅ *Отлично, записала тебя!*\n\n📅 ${dateStr}, ${timeStr}\n⏱ 45 минут\n\nСкоро напишу тебе с деталями 🐱`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Моя запись', 'mybooking')],
      [Markup.button.callback('🏠 На главную', 'start')],
    ])
  );

  if (ADMIN_ID && ADMIN_ID !== 'your_telegram_chat_id_here') {
    const tgLink = user.username ? `@${user.username}` : user.first_name;
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `🔔 Новая запись!\n\nКлиент: ${tgLink}\nДата: ${dateStr}\nВремя: ${timeStr}`
    );
  }
});

bot.action(/^cancel_(\d{4}-\d{2}-\d{2}_\d{4})$/, async (ctx) => {
  await ctx.answerCbQuery();
  const slotKey = ctx.match[1];
  const booking = cancelBooking(slotKey);

  if (!booking) {
    return ctx.reply('Запись не найдена.', mainMenu);
  }

  const slotStr = formatSlotKeyRu(slotKey);
  await ctx.replyWithMarkdown(
    `Запись на *${slotStr}* отменена.\n\nЕсли хочешь выбрать другое время — жми кнопку ниже.`,
    mainMenu
  );

  if (ADMIN_ID && ADMIN_ID !== 'your_telegram_chat_id_here') {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `❌ Клиент ${booking.userName} отменил запись\n\nДата: ${slotStr}`
    );
  }
});

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const bookings = getAllUpcomingBookings();
  if (bookings.length === 0) {
    return ctx.reply('Записей пока нет 🙂');
  }

  const lines = bookings.map(b => `• ${formatSlotKeyRu(b.slotKey)} — ${b.userName}`).join('\n');
  const buttons = bookings.map(b => [
    Markup.button.callback(`❌ ${formatSlotKeyRu(b.slotKey)} — ${b.userName}`, `adm_cancel_${b.slotKey}`),
  ]);

  await ctx.replyWithMarkdown(`📋 *Все записи:*\n\n${lines}`, Markup.inlineKeyboard(buttons));
});

bot.action(/^adm_cancel_(\d{4}-\d{2}-\d{2}_\d{4})$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx)) return;

  const slotKey = ctx.match[1];
  const booking = cancelBooking(slotKey);

  if (!booking) {
    return ctx.reply('Запись не найдена.');
  }

  const slotStr = formatSlotKeyRu(slotKey);
  await ctx.reply(`✅ Запись ${booking.userName} на ${slotStr} отменена.`);

  try {
    await bot.telegram.sendMessage(
      booking.userId,
      `😔 Твоя запись на *${slotStr}* была отменена.\n\nВыбери другое удобное время:`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  } catch (e) {
    // пользователь мог заблокировать бота
  }
});

bot.command('myid', (ctx) => {
  ctx.reply(`Твой Telegram ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.launch();
console.log('Бот запущен ✅');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
