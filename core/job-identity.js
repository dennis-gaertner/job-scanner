// core/job-identity.js — extracted without changing function implementations.

function normalizeUrlForKey_(source, url) {
  let u = String(url || '').trim();
  if (!u) return '';
  
  if (String(source || '').toLowerCase() === 'jobroom') {
    u = u.replace(/([?&])cache=[^&]+/gi, '$1');
    u = u.replace(/[?&]$/g, '');
  }
  
  return u;
}


function extractLhJobIdFromUrl_(url) {
  const u = String(url || '').trim();
  if (!u) return '';

  const m = u.match(/[?&]id=(\d+)/i);
  return m ? m[1] : '';
}


function buildUniqueKey_(source, title, employer, location, url, rawSourceId) {
  const src = canonicalSourceForIdentity_(source);
  const normalizedUrl = normalizeUrlForKey_(src, url);
  const rawId = String(rawSourceId || '').trim();

  // LH: prefer stable job id from URL over rawSourceId
  if (src === 'lh') {
    const lhJobId = extractLhJobIdFromUrl_(url) || rawId;
    if (lhJobId) {
      const raw = [src, lhJobId].map(v => normalizeKeyPart_(v)).join('|');
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
      return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    }
  }

  if (rawId && ['airbus', 'kn', 'aa-kn', 'aa-cities', 'bundat', 'stadtwien'].includes(src)) {
    const raw = [src, rawId].map(v => normalizeKeyPart_(v)).join('|');
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
    return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  }

  const raw = [src, title, employer, location, normalizedUrl]
    .map(v => normalizeKeyPart_(v))
    .join('|');

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function normalizeKeyPart_(value) {
  return String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/https?:\/\//g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
}


function canonicalSourceForIdentity_(source) {
  const src = String(source || '').toLowerCase().trim();

  if (src === 'aa-kn') return 'kn';

  return src;
}


