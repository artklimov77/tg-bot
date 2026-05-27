const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'bookings.json');

function loadBookings() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function saveBookings(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getAvailableDates() {
  const bookings = loadBookings();
  const dates = [];
  const today = new Date();

  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const key = formatDate(date);

    const morning = !bookings[`${key}_morning`];
    const evening = !bookings[`${key}_evening`];

    if (morning || evening) {
      dates.push({ date, key, morning, evening });
    }
  }

  return dates;
}

function book(slotKey, userId, userName) {
  const bookings = loadBookings();
  if (bookings[slotKey]) return false;
  bookings[slotKey] = { userId, userName, bookedAt: new Date().toISOString() };
  saveBookings(bookings);
  return true;
}

function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function formatDateRu(date) {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

module.exports = { getAvailableDates, book, formatDate, formatDateRu };
