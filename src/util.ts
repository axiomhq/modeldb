export function safeParseQueryCSV(str?: string): string[] {
  return (
    str
      ?.split(',')
      .map((f) => f.trim())
      .filter(Boolean) || []
  );
}
