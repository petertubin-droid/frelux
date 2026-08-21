/**
 * CSV & Excel Export Utility
 * Generates downloadable CSV files from structured data.
 * CSV files open directly in Excel/Google Sheets.
 */

export interface CsvColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

/**
 * Convert an array of objects to a CSV string.
 */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const headers = columns.map((c) => escapeCsv(c.header));
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value?.toString() ?? '';
        return escapeCsv(formatted);
      })
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a CSV file in the browser.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns: CsvColumn[]): void {
  const csv = toCsv(rows, columns);
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download a generic JSON file (used for template export, data backup, etc.)
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate an HTML table that opens in Excel when downloaded as .xls.
 * This provides richer formatting than plain CSV.
 */
export function downloadExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[]; columns: CsvColumn[] }[]
): void {
  const html = sheets
    .map((sheet) => {
      const headers = sheet.columns
        .map((c) => `<th style="background:#4f46e5;color:white;padding:8px;text-align:left;font-family:Arial;">${c.header}</th>`)
        .join('');
      const bodyRows = sheet.rows
        .map(
          (row) =>
            `<tr>${sheet.columns
              .map((col) => {
                const value = row[col.key];
                const formatted = col.format ? col.format(value) : value?.toString() ?? '';
                return `<td style="padding:6px;border:1px solid #ddd;font-family:Arial;">${formatted}</td>`;
              })
              .join('')}</tr>`
        )
        .join('');
      return `<table border="1"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    })
    .join('<br/>');

  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Share via email — opens the default mail client.
 */
export function shareViaEmail(to: string, subject: string, body: string): void {
  const params = new URLSearchParams({
    subject,
    body,
  });
  window.open(`mailto:${to}?${params.toString()}`, '_blank');
}
