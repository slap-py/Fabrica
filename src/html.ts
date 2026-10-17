export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function marked(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  let start = 0, result = '', index = text.toLowerCase().indexOf(query);
  while (index >= 0) { result += escapeHtml(text.slice(start,index)) + '<mark>' + escapeHtml(text.slice(index,index+query.length)) + '</mark>'; start=index+query.length; index=text.toLowerCase().indexOf(query,start); }
  return result + escapeHtml(text.slice(start));
}
