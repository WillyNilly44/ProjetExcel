import { useRef, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export default function CalendarView({ data, initialDate }) {
  const calendarRef = useRef();

  function getMondayOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    
    return monday;
  }

  function getSundayOfWeek(date) {
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  }

  function normalizeTime(value) {
    if (!value) return null;
    
    if (typeof value === 'number') {
      let hours = Math.floor(value);
      const minutes = Math.round((value % 1) * 60);
      
      hours = hours % 24;
      
      const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return normalizedTime;
    }

    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        let hours = Math.floor(numValue);
        const minutes = Math.round((numValue % 1) * 60);

        hours = hours % 24;
        
        const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return normalizedTime;
      }

      const cleaned = value.replace(/^(\d{1,2})h(\d{2})$/, '$1:$2');
      const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        let [, hours, minutes] = timeMatch;
        hours = parseInt(hours) % 24; 
        const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return normalizedTime;
      }
      
      const fullTimeMatch = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (fullTimeMatch) {
        let [, hours, minutes] = fullTimeMatch;
        hours = parseInt(hours) % 24; 
        const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return normalizedTime;
      }
    }
    return null;
  }

  function parseDuration(value) {
    if (!value) return 1; 
    
    if (typeof value === 'number') return Math.max(0.5, value); 
    
    if (typeof value === 'string') {
      const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
      return isNaN(numValue) ? 1 : Math.max(0.5, numValue);
    }
    
    return 1;
  }

  const events = useMemo(() => {
    const processedEvents = data.map((row, index) => {
      const possibleDateFields = ['Date', 'date', 'DATE', '__EMPTY_0'];
      let dateValue = null;
      let dateField = null;
      
      if (row.Date) {
        dateValue = row.Date;
        dateField = 'Date';
      } else {
        for (const field of possibleDateFields) {
          if (row[field]) {
            dateValue = row[field];
            dateField = field;
            break;
          }
        }
        
        if (!dateValue) {
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'string' && 
                (/^\d{4}-\d{2}-\d{2}/.test(value) || 
                 /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value) ||
                 /^\d{1,2}-\d{1,2}-\d{4}/.test(value))) {
              dateValue = value;
              dateField = key;
              break;
            }
          }
        }
      }

      if (!dateValue) {
        return null;
      }

      let isoDate;
      try {
        const dateObj = new Date(dateValue);
        if (isNaN(dateObj.getTime())) {
          return null;
        }
        isoDate = dateObj.toISOString().split('T')[0];
      } catch (error) {
        return null;
      }
      
      const startTime = normalizeTime(row['__EMPTY_2']) || 
                       normalizeTime(row['Start']) || 
                       normalizeTime(row['Start (hrs)']) ||
                       '08:00'; 
      
      const duration = parseDuration(row['__EMPTY_5']) || 
                      parseDuration(row['Acc. time']) ||
                      parseDuration(row['Real time (hrs)']) ||
                      parseDuration(row['Duration (hrs)']) ||
                      1; 

      const startDateTime = new Date(`${isoDate}T${startTime}:00`);
      if (isNaN(startDateTime.getTime())) {
        return null;
      }

      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);
      const title = row['Incident'] || 
                   row['Note'] || 
                   row['App Name'] || 
                   row['Event'] ||
                   row['__EMPTY_1'] ||
                   `Entry ${index + 1}`;
      
      return {
        id: `event-${index}`,
        title: title,
        start: startDateTime,
        end: endDateTime,
        allDay: false,
        backgroundColor: row.__isAdminNote ? '#2a4a6b' : '#3788d8',
        borderColor: row.__isAdminNote ? '#1e3a5f' : '#2c7cd1',
        extendedProps: {
          note: row['Note'] || '',
          incident: row['Incident'] || '',
          app: row['App Name'] || '',
          ticket: row['Ticket #'] || '',
          district: row['District'] || '',
          rca: row['RCA'] || '',
          impact: row['Business impact ?'] || row['Impact?'] || '',
          originalData: row,
          isAdminNote: row.__isAdminNote || false
        }
      };
    }).filter(Boolean);

    return processedEvents;
  }, [data]);
  useEffect(() => {
    if (calendarRef.current && initialDate) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        const targetDate = new Date(initialDate);
        const mondayOfWeek = getMondayOfWeek(targetDate);
        const sundayOfWeek = getSundayOfWeek(targetDate);
        calendarApi.gotoDate(mondayOfWeek);
        calendarApi.changeView('timeGridWeek', mondayOfWeek);
      }
    }
  }, [initialDate]);

  useEffect(() => {
    if (calendarRef.current && events.length > 0 && !initialDate) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        const firstEventDate = events[0].start;
        const mondayOfFirstEvent = getMondayOfWeek(firstEventDate);
        calendarApi.gotoDate(mondayOfFirstEvent);
      }
    }
  }, [events, initialDate]);

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ 
        marginBottom: '10px', 
        padding: '8px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '14px',
        color: '#333'
      }}>
        📅 <strong>Calendar:</strong> {events.length} événements
        {initialDate && (
          <span style={{ marginLeft: '10px', color: '#666' }}>
            | Semaine du {getMondayOfWeek(new Date(initialDate)).toLocaleDateString('fr-FR')} au {getSundayOfWeek(new Date(initialDate)).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate ? getMondayOfWeek(new Date(initialDate)) : undefined}
        locale={frLocale}
        events={events}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        height="auto"
        nowIndicator={true}
        allDaySlot={false}
        ref={calendarRef}
        firstDay={1}
        datesSet={(dateInfo) => {
          const end = new Date(dateInfo.end);
          end.setDate(end.getDate() - 1);
        }}
        eventContent={(arg) => {
          const { note, app, ticket, incident, district, rca, impact, isAdminNote } = arg.event.extendedProps;
          const title = arg.event.title;
          const startTime = arg.event.start;

          return (
            <Tippy
              content={
                <div style={{ padding: '8px', maxWidth: 300 }}>
                  <strong style={{ color: isAdminNote ? '#2a4a6b' : '#3788d8' }}>
                    {title}
                  </strong>
                  <br />
                  {incident && <><strong>Incident :</strong> {incident}<br /></>}
                  {district && <><strong>District :</strong> {district}<br /></>}
                  {note && <><strong>Note :</strong> {note}<br /></>}
                  {app && <><strong>Application :</strong> {app}<br /></>}
                  {ticket && <><strong>Ticket # :</strong> {ticket}<br /></>}
                  {rca && <><strong>RCA :</strong> {rca}<br /></>}
                  {impact && <><strong>Impact :</strong> {impact}<br /></>}
                  {startTime && (
                    <><strong>Début :</strong> {startTime.toLocaleString('fr-FR', { 
                      dateStyle: 'short', 
                      timeStyle: 'short' 
                    })}<br /></>
                  )}
                  {isAdminNote && <em style={{ color: '#666' }}>Entrée administrative</em>}
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
              <div style={{ 
                padding: '2px 4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px'
              }}>
                {title}
              </div>
            </Tippy>
          );
        }}
      />
    </div>
  );
}