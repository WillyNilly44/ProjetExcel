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

    function getRecurringDatesForWeekday(weekday) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(today.getDate() - today.getDay() + 1); // lundi

      const endDate = new Date(currentWeekMonday);
      endDate.setDate(endDate.getDate() + 6); // fin de la semaine

      const dayMap = {
        "Sunday": 0,
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
        "Saturday": 6
      };

      const matchingDates = [];
      for (let d = new Date(firstDay); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === dayMap[weekday]) {
          matchingDates.push(new Date(d));
        }
      }
      return matchingDates;
    }

    // === Nettoyage du tableau HTML ===
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

    // === Lignes HTML
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

    // === Lignes Admin récurrentes (multi-instances selon weekday)
    const adminRows = adminNotes
      .filter(n => typeof n === 'object' && n.weekday)
      .flatMap((entry) => {
        const dates = getRecurringDatesForWeekday(entry.weekday);
        return dates.map(dateObj => {
          const row = exportOrder.map(col => {
            if (col === "Date+Start") {
              const d = dateObj.toISOString().split('T')[0];
              const h = entry.start_duration_hrs || '00:00';
              return `${d} ${h}`.trim();
            }
            const key = adminKeyMap[col] || col;
            return entry[key] || '';
          });

          const fullDate = row[exportOrder.indexOf("Date+Start")];
          const dateOnly = fullDate.split(' ')[0];
          row.sortKey = parseDateTime(dateOnly);
          row.isAdmin = true;
          return row;
        });
      });

    // === Fusionner, trier par date descendante
    const allRows = [...tableRows, ...adminRows].sort(
      (a, b) => b.sortKey - a.sortKey
    );

    // === Réassigner les numéros (No)
    const finalBody = allRows.map((row, idx) => {
      const newRow = [...row];
      newRow[exportOrder.indexOf("No")] = `${idx + 1}`;
      return newRow;
    });

    const translatedHeaders = exportOrder.map(col => columnRenames[col] || col);

    // === Génération PDF
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
