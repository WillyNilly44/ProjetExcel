import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarView = ({ 
  data = [], 
  columns = [], 
  formatCellValue, 
  onEventClick,
  showVirtualEntries = true 
}) => {
  const [calendarView, setCalendarView] = useState('dayGridMonth');

  // Format time for calendar - Define this FIRST
  const formatTimeForCalendar = (timeValue) => {
    if (!timeValue) return '00:00:00';
    const timeStr = String(timeValue);
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) return `${timeStr}:00`;
    if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) return timeStr;
    return '00:00:00';
  };

  // Convert log entries to calendar events
  const calendarEvents = useMemo(() => {
    console.log('📅 Starting calendar conversion...', { 
      dataLength: data?.length || 0, 
      columnsLength: columns?.length || 0 
    });

    // Early validation
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('📅 No data available');
      return [];
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      console.log('📅 No columns available');
      return [];
    }

    try {
      // Find columns safely
      const dateColumn = columns.find(col => {
        if (!col || !col.COLUMN_NAME) return false;
        const name = col.COLUMN_NAME.toLowerCase();
        return name.includes('date') || name.includes('created') || name.includes('log_date');
      });

      const titleColumn = columns.find(col => {
        if (!col || !col.COLUMN_NAME) return false;
        const name = col.COLUMN_NAME.toLowerCase();
        return name.includes('incident') || name.includes('description') || name.includes('title');
      });

      const statusColumn = columns.find(col => {
        if (!col || !col.COLUMN_NAME) return false;
        return col.COLUMN_NAME.toLowerCase().includes('status');
      });

      const logTypeColumn = columns.find(col => {
        if (!col || !col.COLUMN_NAME) return false;
        const name = col.COLUMN_NAME.toLowerCase();
        return name.includes('log_type') || name.includes('type');
      });

      if (!dateColumn) {
        console.log('📅 No date column found');
        return [];
      }

      console.log('📅 Found columns:', {
        date: dateColumn.COLUMN_NAME,
        title: titleColumn?.COLUMN_NAME,
        status: statusColumn?.COLUMN_NAME,
        logType: logTypeColumn?.COLUMN_NAME
      });

      // Process each entry
      const events = [];
      
      for (let i = 0; i < data.length; i++) {
        const entry = data[i];
        
        try {
          // Skip invalid entries
          if (!entry || typeof entry !== 'object') {
            console.warn('📅 Invalid entry at index', i);
            continue;
          }

          // Check virtual entries filter
          if (!showVirtualEntries && entry.is_virtual) {
            continue;
          }

          // Get date
          const dateValue = entry[dateColumn.COLUMN_NAME];
          if (!dateValue) {
            console.warn('📅 No date value for entry', entry.id || i);
            continue;
          }

          // Format date safely
          let eventDate;
          try {
            const parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              console.warn('📅 Invalid date:', dateValue);
              continue;
            }
            eventDate = parsedDate.toISOString().split('T')[0];
          } catch (dateError) {
            console.warn('📅 Date parsing error:', dateError, dateValue);
            continue;
          }

          // Get title
          let title = 'Log Entry';
          if (titleColumn && entry[titleColumn.COLUMN_NAME]) {
            const titleValue = entry[titleColumn.COLUMN_NAME];
            if (formatCellValue && typeof formatCellValue === 'function') {
              title = formatCellValue(titleValue, titleColumn.COLUMN_NAME, titleColumn.DATA_TYPE);
            } else {
              title = String(titleValue);
            }
          } else if (entry.id) {
            title = `Entry ${entry.id}`;
          } else {
            title = `Entry ${i + 1}`;
          }

          // Determine colors
          let backgroundColor = '#3788d8'; // Default blue
          let borderColor = '#3788d8';

          // Color by log type
          if (logTypeColumn && entry[logTypeColumn.COLUMN_NAME]) {
            const logType = String(entry[logTypeColumn.COLUMN_NAME]).toLowerCase();
            if (logType.includes('operational')) {
              backgroundColor = '#28a745'; // Green
              borderColor = '#28a745';
            } else if (logType.includes('application')) {
              backgroundColor = '#dc3545'; // Red
              borderColor = '#dc3545';
            }
          }

          // Color for virtual entries
          if (entry.is_virtual) {
            backgroundColor = '#6c757d'; // Gray
            borderColor = '#6c757d';
          }

          // Color by status
          if (statusColumn && entry[statusColumn.COLUMN_NAME]) {
            const status = String(entry[statusColumn.COLUMN_NAME]).toLowerCase();
            if (status.includes('completed')) {
              backgroundColor = '#20c997'; // Success green
              borderColor = '#20c997';
            } else if (status.includes('not completed')) {
              backgroundColor = '#ffc107'; // Warning yellow
              borderColor = '#ffc107';
            }
          }

          // Create event object
          const event = {
            id: entry.id ? String(entry.id) : `entry-${i}`,
            title: entry.is_virtual ? `🔄 ${title}` : String(title),
            start: eventDate,
            backgroundColor,
            borderColor,
            textColor: '#ffffff',
            extendedProps: {
              entry: entry,
              isVirtual: Boolean(entry.is_virtual),
              logType: logTypeColumn ? entry[logTypeColumn.COLUMN_NAME] : null,
              status: statusColumn ? entry[statusColumn.COLUMN_NAME] : null
            }
          };

          events.push(event);

        } catch (entryError) {
          console.error('📅 Error processing entry:', entryError, entry);
        }
      }

      console.log(`📅 Successfully created ${events.length} calendar events`);
      return events;

    } catch (error) {
      console.error('📅 Fatal error in calendar processing:', error);
      return [];
    }
  }, [data, columns, showVirtualEntries, formatCellValue]);

  // Handle event click
  const handleEventClick = (clickInfo) => {
    try {
      const entry = clickInfo.event.extendedProps?.entry;
      if (onEventClick && typeof onEventClick === 'function' && entry) {
        onEventClick(entry);
      }
    } catch (error) {
      console.error('📅 Error handling event click:', error);
    }
  };

  return (
    <div className="calendar-view-container">
      {/* Calendar View Controls */}
      <div className="calendar-controls">

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
            <span>Operational</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
            <span>Application</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#6c757d' }}></div>
            <span>Recurring</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#20c997' }}></div>
            <span>Completed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
            <span>Pending</span>
          </div>
        </div>
      </div>

      {/* FullCalendar Component */}
      <div className="calendar-wrapper">
        {calendarEvents.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            📅 No events to display in calendar view
            <br />
            <small>Try adjusting your filters or check if data is loaded</small>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            view={calendarView}
            eventDidMount={(info) => {
              try {
                const status = info.event.extendedProps?.status || '';
                info.el.title = `${info.event.title}\n${status}\nClick for details`;
              } catch (error) {
                console.error('📅 Error setting event tooltip:', error);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CalendarView;