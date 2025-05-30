import React, { useEffect, useState } from 'react';
import { extractDateInfo } from '../utils/dateUtils';

export default function Filters({ originalData, setFilteredData, setCurrentPage, onMonthFilterChange, onMonthYearChange }) {
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [weeks, setWeeks] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    const dates = originalData.map(extractDateInfo).filter(d => d.date);
    const uniqueYears = [...new Set(dates.map(d => d.date.getFullYear()))]
      .filter(Boolean)
      .sort((a, b) => b - a);
    setYears(uniqueYears);
  }, [originalData]);

  useEffect(() => {
    const filtered = originalData.filter(row => {
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

    setFilteredData(filtered);
    setCurrentPage(0);
  }, [selectedYear, selectedMonth, selectedWeek, originalData]);

  useEffect(() => {
    if (!selectedYear) {
      setMonths([]);
      setWeeks([]);
      return;
    }
    const dates = originalData.map(extractDateInfo).filter(d => d.date && d.date.getFullYear() === Number(selectedYear));
    const uniqueMonths = [...new Set(dates.map(d => d.date.getMonth()))];
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
        onMonthYearChange(new Date(y, m, 1)); // ✅ va au 1er jour du mois
      }
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedYear && !selectedMonth && onMonthYearChange) {
      const y = Number(selectedYear);
      if (!isNaN(y)) {
        onMonthYearChange(new Date(y, 0, 1)); // ✅ va au 1er janvier
      }
    }
  }, [selectedYear]);

  // ✅ Va au début de la semaine sélectionnée
  useEffect(() => {
    if (selectedWeek && onMonthYearChange) {
      const [startStr] = selectedWeek.split('|');
      const start = new Date(startStr);
      if (!isNaN(start)) {
        onMonthYearChange(start);
      }
    }
  }, [selectedWeek]);

  const resetFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedWeek('');
  };

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
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} disabled={!selectedYear}>
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
        <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} disabled={!selectedMonth}>
          <option value="">-- Toutes --</option>
          {weeks.map(w => {
            const [start, end] = w.split('|');
            return <option key={w} value={w}>Semaine du {new Date(start).toLocaleDateString()} au {new Date(end).toLocaleDateString()}</option>;
          })}
        </select>
      </label>

      <button onClick={resetFilters} style={{ marginLeft: '15px' }}>Réinitialiser les filtres</button>
    </div>
  );
}
