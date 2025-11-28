/**
 * Re-export name generation utilities from shared module.
 * This file exists for backwards compatibility with tests that import from scripts/.
 */
export { generateDisplayName, getProviderDisplayName } from '../src/names';
