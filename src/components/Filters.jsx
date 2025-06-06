import React, { useState, useMemo, useEffect } from 'react';
import { extractDateInfo } from '../utils/dateUtils';

export default function Filters({
  originalData,
  setFilteredData,
  setCurrentPage,
  onMonthFilterChange,
  onMonthYearChange,
}) {

  const getCurrentWeekDefaults = () => {
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = today.getMonth().toString();

    const { weekRange } = extractDateInfo({ Date: today.toISOString().split('T')[0] });
    
    return {
      year: currentYear,
      month: currentMonth,
      week: weekRange
    };
  };

  const defaults = getCurrentWeekDefaults();
  const [selectedYear, setSelectedYear] = useState(defaults.year);
  const [selectedMonth, setSelectedMonth] = useState(defaults.month);
  const [selectedWeek, setSelectedWeek] = useState(defaults.week);
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const allDates = useMemo(() => {
    return originalData
      .map(row => {
        const { date } = extractDateInfo(row);
        if (!date) return null;

        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      })
      .filter(date => date !== null); 
  }, [originalData]);


  const availableYears = useMemo(() => {
    const years = [...new Set(allDates.map(date => date.getFullYear()))];
    return years.sort((a, b) => b - a); 
  }, [allDates]);


  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    
    const months = [...new Set(
      allDates
        .filter(date => date.getFullYear() === Number(selectedYear))
        .map(date => date.getMonth())
    )];
    
    return months.sort((a, b) => a - b);
  }, [allDates, selectedYear]);

  const availableWeeks = useMemo(() => {
    if (!selectedYear || selectedMonth === '') return [];
    
    const weekRanges = [...new Set(
      originalData
        .map(row => {
          const { date, weekRange } = extractDateInfo(row);
          if (!date || !weekRange) return null;
          
          if (date.getFullYear() === Number(selectedYear) && 
              date.getMonth() === Number(selectedMonth)) {
            return weekRange;
          }
          return null;
        })
        .filter(range => range !== null)
    )];
    
    return weekRanges.sort();
  }, [originalData, selectedYear, selectedMonth]);

  const filteredData = useMemo(() => {
    if (!selectedYear) {
      return originalData;
    }

    return originalData.filter(row => {
      const { date, weekRange } = extractDateInfo(row);
      if (!date) return false;
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (localDate.getFullYear() !== Number(selectedYear)) return false;

      if (selectedMonth !== '' && localDate.getMonth() !== Number(selectedMonth)) return false;

      if (selectedWeek && weekRange !== selectedWeek) return false;

      return true;
    });
  }, [originalData, selectedYear, selectedMonth, selectedWeek]);

  useEffect(() => {
    if (selectedYear !== defaults.year) {
      setSelectedMonth('');
      setSelectedWeek('');
    }
  }, [selectedYear, defaults.year]);
  useEffect(() => {
    if (selectedMonth !== defaults.month) {
      setSelectedWeek('');
    }
  }, [selectedMonth, defaults.month]);

  useEffect(() => {
    setFilteredData(filteredData);
    setCurrentPage(0);
  }, [filteredData, setFilteredData, setCurrentPage]);


useEffect(() => {
  if (onMonthFilterChange && onMonthYearChange) {
    if (selectedWeek) {
      onMonthFilterChange(false);
      const [startStr] = selectedWeek.split('|');
      onMonthYearChange(new Date(startStr));
    } else if (selectedYear && selectedMonth !== '') {
      onMonthFilterChange(true);
      const monthDate = new Date(Number(selectedYear), Number(selectedMonth), 1);
      onMonthYearChange(monthDate);
    } else if (selectedYear) {
      onMonthFilterChange(true);
      const yearDate = new Date(Number(selectedYear), 0, 1);
      onMonthYearChange(yearDate);
    } else {
      onMonthFilterChange(false);
      onMonthYearChange(new Date());
    }
  }
}, [selectedYear, selectedMonth, selectedWeek, onMonthFilterChange, onMonthYearChange]);
  const formatWeekRange = (weekRange) => {
    const [start, end] = weekRange.split('|');
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `Semaine du ${startDate.getDate()}/${startDate.getMonth() + 1} au ${endDate.getDate()}/${endDate.getMonth() + 1}`;
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <label>
        Année:
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">-- Toutes --</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </label>

      {selectedYear && (
        <label>
          Mois:
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">-- Tous les mois --</option>
            {availableMonths.map(monthIndex => (
              <option key={monthIndex} value={monthIndex}>
                {monthNames[monthIndex]}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedYear && selectedMonth !== '' && (
        <label>
          Semaine:
          <select 
            value={selectedWeek} 
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            <option value="">-- Toutes les semaines --</option>
            {availableWeeks.map(weekRange => (
              <option key={weekRange} value={weekRange}>
                {formatWeekRange(weekRange)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}