// core/settings.js — extracted without changing function implementations.

function getSettingValue_(key, defaultValue) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return defaultValue;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return defaultValue;

  const headers = data[0];
  const keyIdx = headers.indexOf('key');
  const valueIdx = headers.indexOf('value');

  if (keyIdx === -1 || valueIdx === -1) return defaultValue;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx] === key) {
      const value = data[i][valueIdx];
      return value === '' || value === null ? defaultValue : value;
    }
  }

  return defaultValue;
}

// *****************************************
// SOURCE HEALTH
// *****************************************
