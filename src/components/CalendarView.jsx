import { useRef, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export default function CalendarView({ data, initialDate }) {
  const calendarRef = useRef();

  function normalizeTime(value) {
    if (typeof value === 'number') {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/^(\d{1,2})h(\d{2})$/, '$1:$2');
      const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
      if (match) return cleaned;
    }

    return null;
  }

  const events = useMemo(() => {
    return data.map((row, index) => {
      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
      if (!dateKey || !row[dateKey]) return null;

      const rawDate = row[dateKey];
      const isoDate = rawDate.includes('-') ? rawDate : new Date(rawDate).toISOString().split('T')[0];
      const startTime = normalizeTime(row['__EMPTY_2']) || '08:00';
      const duration = parseFloat(row['Acc. time']) || 1;

      const startDate = new Date(`${isoDate}T${startTime}`);
      if (isNaN(startDate.getTime())) return null;

      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

      return {
        id: index,
        title: row['Incident'] || row['Note'] || row['App Name'],
        start: startDate,
        end: endDate,
        allDay: false,
        extendedProps: {
          note: row['Note'],
          incident: row['Incident'],
          app: row['App Name'],
          ticket: row['Ticket #'] || ''
        }
      };
    }).filter(Boolean);
  }, [data]);

  useEffect(() => {
    if (calendarRef.current && initialDate) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        calendarApi.gotoDate(new Date(initialDate));
      }
    }
  }, [initialDate, events]); // 👈 dépend aussi de events

  return (
    <div style={{ marginTop: '20px' }}>
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate || undefined}
        locale={frLocale}
        events={events}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        height="auto"
        nowIndicator={true}
        allDaySlot={false}
        ref={calendarRef}
        eventContent={(arg) => {
          const { note, app, ticket } = arg.event.extendedProps;
          const title = arg.event.title;
          const startTime = arg.event.start;

          return (
            <Tippy
              content={
                <div style={{ padding: '6px', maxWidth: 250 }}>
                  <strong>{title}</strong>
                  <br />
                  {note && <><strong>Note :</strong> {note}<br /></>}
                  {app && <><strong>Application :</strong> {app}<br /></>}
                  {ticket && <><strong>Ticket #:</strong> {ticket}<br /></>}
                  {startTime && <><strong>Début :</strong> {startTime.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}<br /></>}
                </div>
              }
              placement="top"
              zIndex={9999}
              arrow={true}
              theme="light-border"
              delay={[100, 0]}
              interactive={true}
              appendTo={document.body}
            >
              <div>{title}</div>
            </Tippy>
          );
        }}
      />
    </div>
  );
}
