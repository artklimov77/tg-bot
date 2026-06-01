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

function getUserBooking(userId) {
  const bookings = loadBookings();
  for (const [slotKey, val] of Object.entries(bookings)) {
    if (val.userId === userId) return { slotKey, ...val };
  }
  return null;
}

function getAllUpcomingBookings() {
  const bookings = loadBookings();
  const today = formatDate(new Date());
  return Object.entries(bookings)
    .filter(([key]) => key.split('_')[0] >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slotKey, val]) => ({ slotKey, ...val }));
}

function book(slotKey, userId, userName) {
  const bookings = loadBookings();
  if (bookings[slotKey]) return false;
  bookings[slotKey] = { userId, userName, bookedAt: new Date().toISOString() };
  saveBookings(bookings);
  return true;
}

function cancelBooking(slotKey) {
  const bookings = loadBookings();
  if (!bookings[slotKey]) return null;
  const booking = bookings[slotKey];
  delete bookings[slotKey];
  saveBookings(bookings);
  return booking;
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

function formatSlotKeyRu(slotKey) {
  const [dateKey, slot] = slotKey.split('_');
  const [year, month, day] = dateKey.split('-');
  const date = new Date(year, month - 1, day);
  return `${formatDateRu(date)}, ${slotLabel(slot)}`;
}

module.exports = {
  getAvailableDates,
  getUserBooking,
  getAllUpcomingBookings,
  book,
  cancelBooking,
  formatDate,
  formatDateRu,
  slotLabel,
  formatSlotKeyRu,
};
