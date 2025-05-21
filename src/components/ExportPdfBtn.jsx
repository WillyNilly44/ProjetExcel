import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ExportPdfBtn({ adminNotes = [] }) {
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const table = document.querySelector('table');
    if (!table) {
      alert("Aucun tableau trouvé à l'écran.");
      return;
    }

    const columnRenames = {
      "Assigned": "Resource",
      "Note": "Summary",
      "Date+Start": "Scheduled date & time",
      "Acc. time": "Duration (hrs)",
      "District": "Affected site",
      "No": "#",
    };

    const excludedColumns = ["Incident", "Event", "Incid.", "Impact?", "RCA", "", "End", "Est. (hrs)"];
    const exportOrder = ["No", "Ticket #", "Assigned", "Note", "Date+Start", "Acc. time", "District"];

    const adminKeyMap = {
      "Ticket #": "ticket_number",
      "Assigned": "assigned",
      "Note": "note",
      "Date+Start": { date: "date", time: "start_duration_hrs" },
      "Acc. time": "real_time_duration_hrs",
      "District": "district"
    };

    function parseDateTime(str) {
      if (!str || typeof str !== 'string') return new Date(0);
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? new Date(0) : parsed;
    }

    function getAllDatesForWeekdayInSameMonth(rows, weekday) {
      const dateIdx = exportOrder.indexOf("Date+Start");
      const dates = rows
        .map(row => row[dateIdx]?.split(" ")[0])
        .map(d => new Date(d))
        .filter(d => !isNaN(d));

      if (dates.length === 0) return [];

      const base = dates[0];
      const year = base.getFullYear();
      const month = base.getMonth();

      const jsWeekday = {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
        Thursday: 4, Friday: 5, Saturday: 6
      }[weekday];

      if (jsWeekday === undefined) return [];

      const allDates = [];
      let current = new Date(year, month, 1);
      while (current.getMonth() === month) {
        if (current.getDay() === jsWeekday) {
          allDates.push(current.toISOString().split("T")[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      return allDates;
    }

    // Nettoyage du tableau HTML
    const cloned = table.cloneNode(true);
    const headers = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    const indexesToRemove = headers
      .map((name, idx) => (excludedColumns.includes(name) ? idx : -1))
      .filter(idx => idx !== -1);

    [...indexesToRemove].sort((a, b) => b - a).forEach(idx => {
      cloned.querySelectorAll('thead tr').forEach(tr => tr.children[idx]?.remove());
      cloned.querySelectorAll('tbody tr').forEach(tr => tr.children[idx]?.remove());
    });

    const headersAfter = Array.from(cloned.querySelectorAll('thead th')).map(th => th.textContent.trim());

    // Lignes du tableau HTML (sans #)
    const tableRows = Array.from(cloned.querySelectorAll('tbody tr')).map((tr) => {
      const cells = Array.from(tr.children).map(td => td.textContent.trim());

      const row = exportOrder.map(col => {
        if (col === "Date+Start") {
          const d = headersAfter.indexOf("Date");
          const s = headersAfter.indexOf("Start");
          const date = d !== -1 ? cells[d] : '';
          const start = s !== -1 ? cells[s] : '';
          return `${date} ${start}`.trim();
        }
        const idx = headersAfter.indexOf(col);
        return idx !== -1 ? cells[idx] : '';
      });

      const fullDate = row[exportOrder.indexOf("Date+Start")];
      const dateOnly = fullDate.split(' ')[0];
      row.sortKey = parseDateTime(dateOnly);
      row.isAdmin = false;
      return row;
    });

    // Notes admin récurrentes : dupliquer par date de la semaine
    const adminRows = adminNotes
      .filter(n => typeof n === 'object' && n.weekday)
      .flatMap((entry) => {
        const dateList = getAllDatesForWeekdayInSameMonth(tableRows, entry.weekday);

        return dateList.map(dateStr => {
          const row = exportOrder.map(col => {
            if (col === "Date+Start") {
              const h = entry.start_duration_hrs || '00:00';
              return `${dateStr} ${h}`.trim();
            }
            const key = adminKeyMap[col] || col;
            return entry[key] || '';
          });

          row.sortKey = parseDateTime(dateStr);
          row.isAdmin = true;
          return row;
        });
      });

    const allRows = [...tableRows, ...adminRows].sort(
      (a, b) => b.sortKey - a.sortKey
    );

    const finalBody = allRows.map((row, idx) => {
      const newRow = [...row];
      newRow[exportOrder.indexOf("No")] = `${idx + 1}`;
      return newRow;
    });

    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    doc.setFontSize(10);
    doc.text('Export', 14, 15);

    doc.autoTable({
      head: [translatedHeaders],
      body: finalBody,
      startY: 20,
      styles: {
        fontSize: 8,
        overflow: 'linebreak',
        cellPadding: 2,
        valign: 'top'
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        halign: 'left'
      },
      margin: { left: 10, right: 10 }
    });

    doc.save('Export.pdf');
  };

  return (
    <button onClick={exportPdf} style={{ marginBottom: '15px' }}>
      📄 Export
    </button>
  );
}
