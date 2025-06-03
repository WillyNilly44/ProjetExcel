/* eslint-disable no-restricted-globals */
import * as XLSX from 'xlsx';

self.onmessage = async function (e) {
  const { arrayBuffer, sheetNames, adminNotes, utils } = e.data;

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const cleanEmptyValues = utils.cleanEmptyValues;
  const removeFirstColumn = utils.removeFirstColumn;

  const allData = sheetNames.flatMap(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
    rawData = cleanEmptyValues(rawData, sheetName);
    rawData = removeFirstColumn(rawData);
    return rawData;
  });

  const getRecurringDatesForWeekdayInRange = (weekday, startDate, endDate) => {
    const dayMap = {
      "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
      "Thursday": 4, "Friday": 5, "Saturday": 6
    };
    const result = [];
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    while (d <= endDate) {
      if (d.getDay() === dayMap[weekday]) result.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return result;
  };

  const generateRecurringEntries = (notes, minDate, maxDate) => {
    const entries = [];
    for (const note of notes) {
      if (!note.weekday) continue;
      const dates = getRecurringDatesForWeekdayInRange(note.weekday, minDate, maxDate);
      for (const dateObj of dates) {
        entries.push({
          Incident: note.incident || '',
          District: note.district || '',
          Date: dateObj.toISOString().split('T')[0],
          Event: note.maint_event || '',
          __EMPTY_1: note.incident_event || '',
          "Business impact ?": note.business_impact || '',
          RCA: note.rca || '',
          "Duration (hrs)": note.est_duration_hrs || '',
          __EMPTY_2: note.start_duration_hrs || '',
          __EMPTY_3: note.end_duration_hrs || '',
          __EMPTY_4: note.accumulated_business_impact || '',
          __EMPTY_5: note.real_time_duration_hrs || '',
          "Ticket #": note.ticket_number || '',
          Assigned: note.assigned || '',
          Note: note.note || '',
        });
      }
    }
    return entries;
  };

  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() - 1);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);

  const enrichedAllData = allData.map(row => {
    const dateStr = Object.values(row).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
    return {
      ...row,
      Date: row.Date || dateStr || ''
    };
  });

  const recurring = generateRecurringEntries(adminNotes, minDate, maxDate);
  const mergedData = [...enrichedAllData, ...recurring];

  const allKeys = new Set(mergedData.flatMap(row => Object.keys(row)));
  const normalizedMerged = mergedData.map(row => {
    const normalizedRow = {};
    allKeys.forEach(k => {
      normalizedRow[k] = row[k] || '';
    });
    if (normalizedRow.Date) {
      const d = new Date(normalizedRow.Date);
      if (!isNaN(d)) normalizedRow.Date = d.toISOString().split('T')[0];
    }
    return normalizedRow;
  }).sort((a, b) => new Date(a.Date) - new Date(b.Date));

  postMessage(normalizedMerged);
};
