import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers: Record<string, string>
) {
  if (!data || data.length === 0) {
    alert("No data available to export."); 
    return;
  }

  const columnKeys = Object.keys(headers);
  const columnNames = Object.values(headers);

  const csvRows = [
    columnNames.join(','),
  ];

  for (const row of data) {
    const values = columnKeys.map(key => {
      const value = row[key];
      let escaped = String(value ?? '').replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n')) {
        escaped = `"${escaped}"`;
      }
      return escaped;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
