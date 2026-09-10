// core/scanner-utils.js — extracted without changing function implementations.

function daysAgo_(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}


function isMessageRecentEnough_(messageDate, maxAgeDays) {
  if (!(messageDate instanceof Date)) return false;
  return messageDate >= daysAgo_(maxAgeDays);
}


function getMessagesForLabel_(labelName, maxThreads) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) throw new Error('Label nicht gefunden: ' + labelName);
  
  const limit = maxThreads || 200;
  const batchSize = 100;
  const messages = [];
  
  for (let start = 0; start < limit; start += batchSize) {
    const threads = label.getThreads(start, Math.min(batchSize, limit - start));
    if (!threads.length) break;
    
    threads.forEach(thread => {
      thread.getMessages().forEach(message => messages.push(message));
    });
  }
  
  return messages;
}


function fetchWithRetry_(url, attempts, options) {

  const maxAttempts = attempts || 3;

  for (let i = 0; i < maxAttempts; i++) {

    try {

      const res = UrlFetchApp.fetch(url, options || {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const code = res.getResponseCode();

      if (code >= 200 && code < 300) return res;

      throw new Error(
        'HTTP ' + code +
        ' | url=' + url +
        ' | body=' + res.getContentText().slice(0, 800)
      );

    } catch (e) {

      if (i === maxAttempts - 1) throw e;

      Utilities.sleep(2000);
    }
  }
}



function buildShortSnippet_(message) {
  const plain = String(message.getPlainBody ? (message.getPlainBody() || '') : '')
  .replace(/=\r?\n/g, '')
  .replace(/\r?\n/g, ' ')
  .replace(/=3D/g, '=')
  .replace(/=C3=BC/gi, 'ü')
  .replace(/=C3=A4/gi, 'ä')
  .replace(/=C3=B6/gi, 'ö')
  .replace(/=C3=9F/gi, 'ß')
  .replace(/=C3=A9/gi, 'é')
  .replace(/=20/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
  
  if (plain) return plain.slice(0, 300);
  
  const html = String(message.getBody ? (message.getBody() || '') : '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();
  
  return html.slice(0, 300);
}



