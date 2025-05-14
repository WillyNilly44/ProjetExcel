import * as XLSX from "xlsx";

export const headerRenamesBySheet = {
  "Operational Logs": {
    "__EMPTY_1": "Incid.",
    "__EMPTY_2": "Début",
    "__EMPTY_3": "Fin",
    "__EMPTY_4": "Durée",
    "__EMPTY_5": "Temps Réel"
  },
  "Application Logs": {
    "__EMPTY_1": "Incid.",
    "__EMPTY_2": "Début",
    "__EMPTY_3": "Fin",
    "__EMPTY_4": "Durée",
    "__EMPTY_5": "Temps Réel"
  }
};

export function cleanEmptyValues(dataArray, sheetName) {
  const renameMap = headerRenamesBySheet[sheetName] || {};

  return dataArray.map((row) => {
    const cleanedRow = {};
    Object.entries(row).forEach(([key, value], index) => {
      const renamedKey = renameMap[key] || renameMap[`__EMPTY_${index}`] || key;

      if (typeof value === "number" && value > 30000 && value < 60000) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
          value = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      }

      if (typeof value === "number" && value > 0 && value < 1) {
        const totalSeconds = Math.round(value * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const hourLikeColumns = ["Est. (hrs)", "Acc. time"]; 
        hourLikeColumns.includes()

        value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }

      cleanedRow[renamedKey] = value;
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
