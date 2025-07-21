import type { Context } from 'hono';

export function jsonResponse(
  c: Context,
  data: unknown,
  status: number,
  pretty = false
) {
  if (pretty) {
    const prettyJson = JSON.stringify(data, null, 2);
    return c.text(prettyJson, status, {
      'Content-Type': 'application/json',
    });
  }
  return c.json(data, status);
}
