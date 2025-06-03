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

  // 🔁 Dates enrichies (mémorisées)
  const enrichedDates = useMemo(() => {
    return originalData.map(extractDateInfo).filter(d => d.date);
  }, [originalData]);

  // 📅 Années disponibles
  const years = useMemo(() => {
    return [...new Set(enrichedDates.map(d => d.date.getFullYear()))]
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [enrichedDates]);

  // 📅 Mois disponibles pour l’année sélectionnée
  const months = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(
      enrichedDates
        .filter(d => d.date.getFullYear() === Number(selectedYear))
        .map(d => d.date.getMonth())
    )];
  }, [selectedYear, enrichedDates]);

  // 📅 Semaines disponibles pour le mois sélectionné
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

  // 🔍 Données filtrées selon sélection
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

  // 🎯 Appliquer les données filtrées
  useEffect(() => {
    setFilteredData(filtered);
    setCurrentPage(0);
  }, [filtered]);

  // 🗓 Vue calendrier synchronisée
  useEffect(() => {
    if (!selectedYear) {
      setMonths([]);
      setWeeks([]);
      return;
    }
    const dates = originalData.map(extractDateInfo).filter(d => d.date && d.date.getFullYear() === Number(selectedYear));
    const uniqueMonths = [...new Set(dates.map(d => d.date.getMonth()))];
    setSelectedMonth('');
    setSelectedWeek('');
    setMonths(uniqueMonths);
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedMonth) {
      setWeeks([]);
      return;
    }

    const dates = originalData.map(extractDateInfo).filter(d =>
      d.date &&
      d.date.getFullYear() === Number(selectedYear) &&
      d.date.getMonth() === Number(selectedMonth)
    );
    const uniqueWeeks = [...new Set(dates.map(d => d.weekRange))];
    setWeeks(uniqueWeeks);

    if (onMonthFilterChange) {
      onMonthFilterChange(!!selectedMonth);
    }

    if (onMonthYearChange) {
      const y = Number(selectedYear);
      const m = Number(selectedMonth);
      if (!isNaN(y) && !isNaN(m)) {
        onMonthYearChange(new Date(y, m, 1));
      }
    }
    setSelectedWeek('');
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedYear && !selectedMonth && onMonthYearChange) {
      const y = Number(selectedYear);
      if (!isNaN(y)) {
        onMonthYearChange(new Date(y, 0, 1));
      }
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedWeek && onMonthYearChange) {
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

  console.log(selectedWeek);
  console.log(selectedMonth);
  console.log(selectedYear);

  return (
    <div id="filters">
      <label>
        Année:
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          <option value="">-- Toutes --</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>

      <label>
        Mois:
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
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
