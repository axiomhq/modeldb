export function safeParseQueryCSV(str?: string): string[] {
  return (
    str
      ?.split(',')
      .map((f) => f.trim())
      .filter(Boolean) || []
  );
}

export function objectsToCSV(
  // biome-ignore lint: disable
  data: any[],
  fields?: string[],
  includeHeaders = true
): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = fields || Object.keys(data[0]);
  const csvHeader = headers.map(escapeCSVField).join(',');

  const csvRows = data.map((item) =>
    headers
      .map((field) => {
        const value = item[field];
        return escapeCSVField(
          value === null || value === undefined ? '' : String(value)
        );
      })
      .join(',')
  );

  return includeHeaders
    ? [csvHeader, ...csvRows].join('\n')
    : csvRows.join('\n');
}

function escapeCSVField(field: string): string {
  if (field.includes('"') || field.includes(',') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
