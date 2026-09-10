// core/dates.js — extracted without changing function implementations.

function endOfDay_(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}


function formatDateForMail_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
}



