import React, { useState, useMemo, useEffect } from 'react';
import { extractDateInfo } from '../utils/dateUtils';

export default function Filters({
  originalData,
  setFilteredData,
  setCurrentPage,
  onMonthFilterChange,
  onMonthYearChange,
}) {

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

  function getWeekId(date) {
    const monday = getMondayOfWeek(date);
    return monday.toISOString().split('T')[0];
  }
  const getCurrentWeekDefaults = () => {
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = today.getMonth().toString();
    const currentWeekId = getWeekId(today);
    
    return {
      year: currentYear,
      month: currentMonth,
      week: currentWeekId
    };
  };

  const defaults = getCurrentWeekDefaults();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  
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
    
    const monthDates = allDates.filter(date => 
      date.getFullYear() === Number(selectedYear) && 
      date.getMonth() === Number(selectedMonth)
    );
    const weekMap = new Map();
    
    monthDates.forEach(date => {
      const weekId = getWeekId(date);
      if (!weekMap.has(weekId)) {
        const monday = getMondayOfWeek(date);
        const sunday = getSundayOfWeek(date);
        weekMap.set(weekId, {
          id: weekId,
          monday: monday,
          sunday: sunday
        });
      }
    });
    
    return Array.from(weekMap.values()).sort((a, b) => a.monday - b.monday);
  }, [allDates, selectedYear, selectedMonth]);

  useEffect(() => {
    if (originalData.length > 0 && !selectedYear) {
      const hasCurrentYear = availableYears.includes(Number(defaults.year));
      
      if (hasCurrentYear) {
        setSelectedYear(defaults.year);
        setTimeout(() => {
          const currentMonthHasData = allDates.some(date => 
            date.getFullYear() === Number(defaults.year) && 
            date.getMonth() === Number(defaults.month)
          );
          
          if (currentMonthHasData) {
            setSelectedMonth(defaults.month);
            setTimeout(() => {
              const currentWeekHasData = allDates.some(date => 
                date.getFullYear() === Number(defaults.year) && 
                date.getMonth() === Number(defaults.month) &&
                getWeekId(date) === defaults.week
              );
              
              if (currentWeekHasData) {
                setSelectedWeek(defaults.week);
              }
            }, 0);
          }
        }, 0);
      }
    }
  }, [originalData, availableYears, allDates, defaults.year, defaults.month, defaults.week, selectedYear]);

  const filteredData = useMemo(() => {
    if (!selectedYear) return originalData;

    return originalData.filter(row => {
      const { date } = extractDateInfo(row);
      if (!date) return false;
      
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (localDate.getFullYear() !== Number(selectedYear)) return false;

      if (selectedMonth !== '' && localDate.getMonth() !== Number(selectedMonth)) return false;

      if (selectedWeek) {
        const rowWeekId = getWeekId(localDate);
        if (rowWeekId !== selectedWeek) return false;
      }

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
        const monday = new Date(selectedWeek + 'T00:00:00');
        onMonthYearChange(monday);
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

  const formatWeekRange = (week) => {
    const startDay = week.monday.getDate();
    const startMonth = week.monday.getMonth() + 1;
    const endDay = week.sunday.getDate();
    const endMonth = week.sunday.getMonth() + 1;
    
    return `Semaine du ${startDay}/${startMonth} au ${endDay}/${endMonth}`;
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

      {selectedYear && selectedMonth !== '' && availableWeeks.length > 0 && (
        <label>
          Semaine:
          <select 
            value={selectedWeek} 
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            <option value="">-- Toutes les semaines --</option>
            {availableWeeks.map(week => (
              <option key={week.id} value={week.id}>
                {formatWeekRange(week)}
              </option>
            ))}
          </select>
        </label>
      )}
     
    </div>
  );
}