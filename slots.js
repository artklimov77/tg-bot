const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'bookings.json');
const SLOTS = ['1000', '1100', '1700', '2000'];

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

  for (let i = 1; i <= 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Only Tuesday (2) and Thursday (4)
    const dow = date.getDay();
    if (dow !== 2 && dow !== 4) continue;

    const key = formatDate(date);
    const availableSlots = SLOTS.filter(slot => !bookings[`${key}_${slot}`]);

    if (availableSlots.length > 0) {
      dates.push({ date, key, slots: availableSlots });
    }

    if (dates.length >= 6) break;
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

function slotLabel(slot) {
  const labels = {
    '1000': '10:00 🌅',
    '1100': '11:00 🌅',
    '1700': '17:00 🌙',
    '2000': '20:00 🌙',
  };
  return labels[slot] || slot;
}

module.exports = { getAvailableDates, book, formatDate, formatDateRu, slotLabel };
