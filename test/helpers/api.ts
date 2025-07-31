import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import type { Hono } from 'hono';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

export async function makeRequest(
  app: Hono,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `http://localhost${path}`;
  const request = new IncomingRequest(url, options);
  const ctx = createExecutionContext();
  const response = await app.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export async function getJSON(app: Hono, path: string): Promise<unknown> {
  const response = await makeRequest(app, path);
  return response.json();
}

export async function getText(app: Hono, path: string): Promise<string> {
  const response = await makeRequest(app, path);
  return response.text();
}

export function expectStatus(response: Response, status: number): void {
  if (response.status !== status) {
    throw new Error(`Expected status ${status}, got ${response.status}`);
  }
}

export async function expectJSON(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON content-type, got ${contentType}`);
  }
  return response.json();
}

export async function expectCSV(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('text/csv')) {
    throw new Error(`Expected CSV content-type, got ${contentType}`);
  }
  return response.text();
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] === ',')) {
      inQuotes = true;
    } else if (
      char === '"' &&
      inQuotes &&
      (i === line.length - 1 || line[i + 1] === ',')
    ) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(
      headers.map((header, i) => [header, values[i] || ''])
    );
  });
}
