export type Logger = {
  info: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
};

export function getCronLogger(): Logger {
  return {
    info: (msg: string) => {
      // biome-ignore lint/suspicious/noConsole: explicit logging for cron when enabled
      console.info(`[cron] ${msg}`);
    },
    error: (msg: string, err?: unknown) => {
      // biome-ignore lint/suspicious/noConsole: explicit logging for cron when enabled
      console.error(`[cron] ${msg}`, err);
    },
  };
}
