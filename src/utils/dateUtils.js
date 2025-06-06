export function extractDateInfo(row) {
  const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
  if (!dateKey || !row[dateKey]) return { date: null };
  
  const dateStr = row[dateKey];
  let date;
  
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    date = new Date(year, month - 1, day); 
  } else {
    date = new Date(dateStr);
  }
  
  if (isNaN(date.getTime())) return { date: null };

  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    date,
    weekRange: `${monday.toISOString().slice(0, 10)}|${sunday.toISOString().slice(0, 10)}`
  };
}