import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function CalendarView({ data, initialDate  }) {
  const events = data.map((row, index) => {
    const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
    if (!dateKey || !row[dateKey]) return null;
    const date = new Date(row[dateKey]);
    if (isNaN(date.getTime())) return null;

    return {
      id: index,
      title: row['Incident'] || row['Note'] || row['App Name'] || 'Événement',
      start: date.toISOString().split('T')[0],
      allDay: true
    };
  }).filter(Boolean);

  return (
    <div style={{ marginTop: '20px' }}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        locale="fr"
        events={events}
        height="auto"
      />
    </div>
  );
}