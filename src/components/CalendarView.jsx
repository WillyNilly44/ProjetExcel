import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export default function CalendarView({ data, initialDate }) {
  const events = data.map((row, index) => {
    const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
    const startTime = row['Start'] || row['Heure'] || '08:00';
    const duration = parseFloat(row['Acc. time']) || 1;

    if (!dateKey || !row[dateKey]) return null;

    const startDate = new Date(`${row[dateKey]}T${startTime}`);
    if (isNaN(startDate.getTime())) return null;

    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    return {
      id: index,
      title: row['Incident'] || row['Note'] || row['App Name'] || 'Événement',
      start: startDate,
      end: endDate,
      allDay: false,
      extendedProps: {
        note: row['Note'],
        incident: row['Incident'],
        app: row['App Name'],
        district: row['District'],
        duration: row['Acc. time']
      }
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
        eventContent={(arg) => {
          const { note, incident, app, district, duration } = arg.event.extendedProps;
          const title = arg.event.title;

          return (
            <Tippy
              content={
                <div style={{ padding: '6px', maxWidth: 250 }}>
                  <strong>{title}</strong>
                  <br />
                  {incident && <><strong>Incident :</strong> {incident}<br /></>}
                  {note && <><strong>Note :</strong> {note}<br /></>}
                  {app && <><strong>Application :</strong> {app}<br /></>}
                  {district && <><strong>District :</strong> {district}<br /></>}
                  {duration && <><strong>Durée :</strong> {duration}h</>}
                </div>
              }
              placement="top"
              arrow={true}
              theme="light-border"
              delay={[100, 0]}
              interactive={true}
            >
              <div>{title}</div>
            </Tippy>
          );
        }}
      />
    </div>
  );
}
