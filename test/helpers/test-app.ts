import app from '../../src/index';

export function createTestApp(_options?: { env?: 'dev' | 'production' }) {
  // The environment needs to be mocked before importing the app
  // Since the app is imported at the top, we can't change it per test
  return app;
}
