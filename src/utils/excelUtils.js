import * as XLSX from 'xlsx';

export const headerRenamesBySheet = {
  'Operational Logs': {
    '__EMPTY_1': 'Incid.',
    '__EMPTY_2': 'Start',
    '__EMPTY_3': 'End',
    '__EMPTY_4': ' ',
    '__EMPTY_5': 'Actual time'
  },
  'Application Logs': {
    '__EMPTY': 'App Name',
    '__EMPTY_1': 'Environment',
    '__EMPTY_2': 'Date',
    '__EMPTY_3': 'Error Type',
    '__EMPTY_4': 'Message',
    '__EMPTY_5': 'Stack Trace'
  }
};

export function cleanEmptyValues(dataArray, sheetName) {
  const renameMap = headerRenamesBySheet[sheetName] || {};

  return dataArray.map(row => {
    const cleanedRow = {};
    Object.entries(row).forEach(([key, value], i) => {
      const newKey = renameMap[key] || renameMap[`__EMPTY_${i}`] || key;
      if (typeof value === 'number' && value > 30000 && value < 60000) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
          value = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      }
      cleanedRow[newKey] = value;
    });
    return cleanedRow;
  });
}

export function removeFirstColumn(data) {
  return data.map(row => {
    const entries = Object.entries(row).slice(1);
    return Object.fromEntries(entries);
  });
}
