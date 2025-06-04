import React, { useEffect, useMemo, useState } from 'react';
import { extractDateInfo } from '../utils/dateUtils';

export default function Filters({
  originalData,
  setFilteredData,
  setCurrentPage,
  onMonthFilterChange,
  onMonthYearChange,
}) {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  const enrichedDates = useMemo(() => {
    return originalData.map(extractDateInfo).filter(d => d.date);
  }, [originalData]);

  const years = useMemo(() => {
    return [...new Set(enrichedDates.map(d => d.date.getFullYear()))]
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [enrichedDates]);

  const months = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(
      enrichedDates
        .filter(d => d.date.getFullYear() === Number(selectedYear))
        .map(d => d.date.getMonth())
    )];
  }, [selectedYear, enrichedDates]);

  const weeks = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    return [...new Set(
      enrichedDates
        .filter(d =>
          d.date.getFullYear() === Number(selectedYear) &&
          d.date.getMonth() === Number(selectedMonth)
        )
        .map(d => d.weekRange)
    )];
  }, [selectedYear, selectedMonth, enrichedDates]);

  const filtered = useMemo(() => {
    const result = originalData.filter(row => {
      const { date } = extractDateInfo(row);
      if (!date) return false;

      if (selectedYear && date.getFullYear() !== Number(selectedYear)) return false;
      if (selectedMonth && date.getMonth() !== Number(selectedMonth)) return false;

      if (selectedWeek) {
        const [startStr, endStr] = selectedWeek.split('|');
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (date < start || date > end) return false;
      }

      return true;
    });

    return result;
  }, [originalData, selectedYear, selectedMonth, selectedWeek]);

  useEffect(() => {
    setFilteredData(filtered);
    setCurrentPage(0);
  }, [filtered]);

  useEffect(() => {
    if (onMonthFilterChange) onMonthFilterChange(!!selectedMonth);

    let baseDate = null;

    if (selectedWeek) {
      const [startStr] = selectedWeek.split('|');
      baseDate = new Date(startStr);
    } else if (selectedYear && selectedMonth !== '') {
      baseDate = new Date(Number(selectedYear), Number(selectedMonth), 1);
    } else if (selectedYear) {
      baseDate = new Date(Number(selectedYear), 0, 1);
    }

    if (baseDate && onMonthYearChange) onMonthYearChange(baseDate);
  }, [selectedYear, selectedMonth, selectedWeek]);

  const resetFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedWeek('');
  };

  return (
    <div id="filters">
      <label>
        Année:
        <select value={selectedYear} onChange={e => {
          setSelectedYear(e.target.value);
          setSelectedMonth('');
          setSelectedWeek('');
        }}>
          <option value="">-- Toutes --</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>

      <label>
        Mois:
        <select
          value={selectedMonth}
          onChange={e => {
            setSelectedMonth(e.target.value);
            setSelectedWeek('');
          }}
          disabled={!selectedYear}
        >
          <option value="">-- Tous --</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(0, m).toLocaleString('fr', { month: 'long' }).replace(/^./, c => c.toUpperCase())}
            </option>
          ))}
        </select>
      </label>

      <label>
        Semaine:
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
          disabled={!selectedMonth}
        >
          <option value="">-- Toutes --</option>
          {weeks.map(w => {
            const [start, end] = w.split('|');
            return (
              <option key={w} value={w}>
                Semaine du {new Date(start).toLocaleDateString()} au {new Date(end).toLocaleDateString()}
              </option>
            );
          })}
        </select>
      </label>

      <button onClick={resetFilters} style={{ marginLeft: '15px' }}>Réinitialiser les filtres</button>
    </div>
  );
}
