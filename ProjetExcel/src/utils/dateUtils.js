export function extractDateInfo(row) {
  const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date'));
  if (!dateKey || !row[dateKey]) return { date: null };
  const date = new Date(row[dateKey]);
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