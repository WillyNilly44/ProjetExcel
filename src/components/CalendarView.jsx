import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

export default function CalendarView({ data, initialDate }) {
  const events = data.map((row, index) => {
    const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
    const startTime = row['Start'] || row['Heure'] || '08:00';
    const duration = parseFloat(row['Acc. time']) || 1; // en heures

    if (!dateKey || !row[dateKey]) return null;

    const startDate = new Date(`${row[dateKey]}T${startTime}`);
    if (isNaN(startDate.getTime())) return null;

    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    return {
      id: index,
      title: row['Incident'] || row['Note'] || row['App Name'] || 'Événement',
      start: startDate,
      end: endDate,
      allDay: false
    };
  }).filter(Boolean);

  return (
    <div style={{ marginTop: '20px' }}>
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate || undefined}
        locale={frLocale}
        events={events}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        height="auto"
        nowIndicator={true}
        allDaySlot={false}
      />
    </div>
  );
}
