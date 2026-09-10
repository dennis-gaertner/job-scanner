// scanners/Workday.js — extracted without changing function implementations.

function cleanWorkdayMailHtml_(html) {
  return String(html || '')
    .replace(/=\r?\n/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/=3D/g, '=')
    .replace(/=C3=BC/gi, 'ü')
    .replace(/=C3=A4/gi, 'ä')
    .replace(/=C3=B6/gi, 'ö')
    .replace(/=C3=9F/gi, 'ß')
    .replace(/=C3=A9/gi, 'é')
    .replace(/=20/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function extractWorkdayJobIdFromUrl_(url) {
  const m = String(url || '').match(/(JR\d+)/i);
  return m ? m[1].toUpperCase() : '';
}


function findJobPostingJsonLdFromHtml_(html) {
  const matches = [...String(html || '').matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of arr) {
        if (!item) continue;

        if (item['@type'] === 'JobPosting') return item;

        if (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')) {
          return item;
        }

        if (item.mainEntity && item.mainEntity['@type'] === 'JobPosting') {
          return item.mainEntity;
        }
      }
    } catch (e) {
      // ignore malformed JSON-LD
    }
  }

  return null;
}


function extractMetaContentByNameGeneric_(html, name) {
  const re = new RegExp(
    '<meta[^>]+name="' + escapeRegexGeneric_(name) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractMetaContentByPropertyGeneric_(html, property) {
  const re = new RegExp(
    '<meta[^>]+property="' + escapeRegexGeneric_(property) + '"[^>]+content="([^"]*)"',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? htmlDecode_(m[1]) : '';
}


function extractLabeledValueFromHtmlTextGeneric_(html, label) {
  const text = stripHtml_(html);
  const re = new RegExp(
    escapeRegexGeneric_(label) + '\\s*[:|-]?\\s*([^|\\n\\r]{1,120})',
    'i'
  );
  const m = text.match(re);
  return m ? String(m[1] || '').trim() : '';
}


function cleanWorkdayDetailText_(text, maxLen) {
  const cleaned = stripHtml_(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return cleaned.slice(0, maxLen || 5000);
}


function escapeRegexGeneric_(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function extractWorkdayLocationFromTrailingText_(text) {
  let t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return '';

  let m = t.match(/^\(([^)]+)\)/);
  if (m) return m[1].trim();

  m = t.match(/^[-–—:,]\s*(.+)$/);
  if (m) return m[1].trim();

  m = t.match(/^([A-Z][A-Za-zÀ-ÿ' .\/-]{1,80})$/);
  if (m) return m[1].trim();

  return '';
}


/**
 * Generischer Workday-Newsletter-Parser:
 * <a href=".../JR12345678">Job Title</a> (Location)
 */
function extractWorkdayJobsFromHtml_(html, sourceOptions) {
  const opts = sourceOptions || {};
  const urlPattern = opts.urlPattern || 'https:\\/\\/[^"]*myworkdayjobs\\.com\\/[^"]*\\/JR\\d+[^"]*';
  const employer = opts.employer || '';
  const cleaned = cleanWorkdayMailHtml_(html);

  const regex = new RegExp(
    '<a[^>]*href="(' + urlPattern + ')"[^>]*>([\\s\\S]*?)<\\/a>\\s*([\\s\\S]{0,180}?)(?=<a\\b|<br\\b|<\\/td>|<\\/div>|<\\/p>|<\\/tr>|$)',
    'gi'
  );

  const jobs = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const url = htmlDecode_(match[1].trim());
    const title = htmlDecode_(stripHtml_(match[2]).trim());
    const trailing = htmlDecode_(stripHtml_(match[3]).trim());

    const rawSourceId = extractWorkdayJobIdFromUrl_(url);
    const location = extractWorkdayLocationFromTrailingText_(trailing);

    if (!title || !url || !rawSourceId) continue;

    jobs.push({
      title,
      location,
      employer,
      percent_or_workload: '',
      grade: '',
      domain: '',
      dg: '',
      url,
      rawSnippet: [title, location].filter(Boolean).join(' | '),
      raw_source_id: rawSourceId
    });
  }

  return dedupeJobsByMiniKey_(jobs);
}


function extractWorkdayDetailFromHtml_(html, options) {
  const opts = options || {};
  const fallbackEmployer = opts.fallbackEmployer || '';
  const departmentLabels = opts.departmentLabels || [
    'Department',
    'Organization',
    'Organisation',
    'Job Family'
  ];

  const employmentTypeLabels = opts.employmentTypeLabels || [
    'Employment Type',
    'Employment type',
    'Worker Type',
    'Time Type'
  ];
  const jobPosting = findJobPostingJsonLdFromHtml_(html);

  let detailText = '';
  let department = '';
  let employmentType = '';
  let employer = fallbackEmployer;
  let postingDate = '';

  if (jobPosting) {
    detailText = cleanWorkdayDetailText_(jobPosting.description || '', 5000);
    employmentType = String(jobPosting.employmentType || '').trim();
    postingDate = String(jobPosting.datePosted || '').trim();

    if (jobPosting.hiringOrganization) {
      if (typeof jobPosting.hiringOrganization === 'string') {
        employer = jobPosting.hiringOrganization.trim();
      } else if (jobPosting.hiringOrganization.name) {
        employer = String(jobPosting.hiringOrganization.name).trim();
      }
    }
  }

  if (!detailText) {
    const metaDesc =
      extractMetaContentByNameGeneric_(html, 'description') ||
      extractMetaContentByPropertyGeneric_(html, 'og:description') ||
      '';
    detailText = cleanWorkdayDetailText_(metaDesc, 5000);
  }

  if (!employmentType) {
    const m = stripHtml_(html).match(/Employment Type:\s*([^\-|]{1,80})/i);
    if (m) employmentType = String(m[1] || '').trim();
  }

  if (!department) {
    const m = stripHtml_(html).match(/Job Family:\s*([^\-|]{1,80})/i);
    if (m) department = String(m[1] || '').trim();
  }

  return {
    detail_text: detailText,
    department,
    employmentType,
    employer,
    postingDate
  };
}




// *****************************************
// 10. HTML-/Text-Helfer
// *****************************************


function extractAirbusLocationFromFollowingHtml_(htmlFragment) {
  const text = htmlDecode_(stripHtml_(htmlFragment))
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  // typischer Airbus-Fall: "(Brasov (30 Hermann))"
  const parenStart = text.indexOf('(');
  if (parenStart !== -1) {
    let depth = 0;
    let out = '';

    for (let i = parenStart; i < text.length; i++) {
      const ch = text[i];
      out += ch;

      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          return out.slice(1, -1).trim();
        }
      }
    }
  }

  // Fallback: bis zum ersten stärkeren Trenner
  const fallback = text.split(/(?:\bWenn Sie\b|Mit freundlichen Grüßen|Folgen Sie uns auf|Stellen-Alerts verwalten)/i)[0]
    .trim();

  return fallback.slice(0, 100).trim();
}



function parseUrlQueryParams_(url) {
  const out = {};
  const q = String(url || '').split('?')[1] || '';
  if (!q) return out;

  q.split('&').forEach(pair => {
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '').trim();
    const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' ')).trim();
    if (key) out[key] = value;
  });

  return out;
}





//generic html stripper (for job titles and such)
function stripHtml_(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&uuml;/gi, 'ü')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&auml;/gi, 'ä')
    .replace(/&szlig;/gi, 'ß')
    .replace(/\s+/g, ' ')
    .trim();
}