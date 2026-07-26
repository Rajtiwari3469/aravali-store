function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return s.replace(/[&<>"']/g, c => map[c]);
}

function sanitizeInput(str) {
  if (str == null) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
}
