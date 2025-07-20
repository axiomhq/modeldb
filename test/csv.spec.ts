import { describe, expect, it } from 'vitest';
import { safeParseQueryCSV, objectsToCSV } from '../src/csv';

describe('csv utilities', () => {
  describe('safeParseQueryCSV', () => {
    it('should parse comma-separated values', () => {
      const result = safeParseQueryCSV('value1,value2,value3');
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should trim whitespace from values', () => {
      const result = safeParseQueryCSV(' value1 , value2 ,  value3  ');
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should filter out empty values', () => {
      const result = safeParseQueryCSV('value1,,value2,,,value3,');
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle undefined input', () => {
      const result = safeParseQueryCSV(undefined);
      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = safeParseQueryCSV('');
      expect(result).toEqual([]);
    });

    it('should handle single value', () => {
      const result = safeParseQueryCSV('singlevalue');
      expect(result).toEqual(['singlevalue']);
    });

    it('should handle values with special characters', () => {
      const result = safeParseQueryCSV('model-id,provider_name,type.chat');
      expect(result).toEqual(['model-id', 'provider_name', 'type.chat']);
    });

    it('should handle only commas', () => {
      const result = safeParseQueryCSV(',,,');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only values', () => {
      const result = safeParseQueryCSV('value1,   ,value2');
      expect(result).toEqual(['value1', 'value2']);
    });
  });

  describe('objectsToCSV', () => {
    describe('basic functionality', () => {
      it('should convert array of objects to CSV', () => {
        const data = [
          { id: '1', name: 'Test 1', value: 100 },
          { id: '2', name: 'Test 2', value: 200 },
        ];

        const result = objectsToCSV(data);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('id,name,value');
        expect(lines[1]).toBe('1,Test 1,100');
        expect(lines[2]).toBe('2,Test 2,200');
      });

      it('should handle empty array', () => {
        const result = objectsToCSV([]);
        expect(result).toBe('');
      });

      it('should handle null/undefined data', () => {
        expect(objectsToCSV(null as any)).toBe('');
        expect(objectsToCSV(undefined as any)).toBe('');
      });
    });

    describe('field selection', () => {
      it('should use specified fields only', () => {
        const data = [
          { id: '1', name: 'Test 1', value: 100, extra: 'ignored' },
          { id: '2', name: 'Test 2', value: 200, extra: 'ignored' },
        ];

        const result = objectsToCSV(data, ['id', 'value']);
        const lines = result.split('\n');

        expect(lines[0]).toBe('id,value');
        expect(lines[1]).toBe('1,100');
        expect(lines[2]).toBe('2,200');
      });

      it('should handle non-existent fields', () => {
        const data = [
          { id: '1', name: 'Test 1' },
          { id: '2', name: 'Test 2' },
        ];

        const result = objectsToCSV(data, ['id', 'nonexistent']);
        const lines = result.split('\n');

        expect(lines[0]).toBe('id,nonexistent');
        expect(lines[1]).toBe('1,');
        expect(lines[2]).toBe('2,');
      });

      it('should preserve field order', () => {
        const data = [{ a: 1, b: 2, c: 3 }];

        const result = objectsToCSV(data, ['c', 'a', 'b']);
        const lines = result.split('\n');

        expect(lines[0]).toBe('c,a,b');
        expect(lines[1]).toBe('3,1,2');
      });
    });

    describe('header handling', () => {
      it('should include headers by default', () => {
        const data = [{ id: '1', name: 'Test' }];
        const result = objectsToCSV(data);
        
        expect(result.startsWith('id,name')).toBe(true);
      });

      it('should exclude headers when specified', () => {
        const data = [
          { id: '1', name: 'Test 1' },
          { id: '2', name: 'Test 2' },
        ];

        const result = objectsToCSV(data, undefined, false);
        const lines = result.split('\n');

        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe('1,Test 1');
        expect(lines[1]).toBe('2,Test 2');
      });
    });

    describe('value escaping', () => {
      it('should escape fields containing commas', () => {
        const data = [{ id: '1', name: 'Smith, John', value: 100 }];
        const result = objectsToCSV(data);
        
        expect(result).toContain('"Smith, John"');
      });

      it('should escape fields containing quotes', () => {
        const data = [{ id: '1', name: 'John "Johnny" Smith' }];
        const result = objectsToCSV(data);
        
        expect(result).toContain('"John ""Johnny"" Smith"');
      });

      it('should escape fields containing newlines', () => {
        const data = [{ id: '1', description: 'Line 1\nLine 2' }];
        const result = objectsToCSV(data);
        
        expect(result).toContain('"Line 1\nLine 2"');
      });

      it('should handle fields with multiple special characters', () => {
        const data = [{ text: 'Has, commas and "quotes" and\nnewlines' }];
        const result = objectsToCSV(data);
        
        expect(result).toContain('"Has, commas and ""quotes"" and\nnewlines"');
      });

      it('should not escape simple fields', () => {
        const data = [{ id: '1', name: 'Simple Text' }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,Simple Text');
      });
    });

    describe('null and undefined handling', () => {
      it('should convert null values to empty strings', () => {
        const data = [{ id: '1', name: null, value: 100 }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,,100');
      });

      it('should convert undefined values to empty strings', () => {
        const data = [{ id: '1', name: undefined, value: 100 }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,,100');
      });

      it('should handle objects with missing properties', () => {
        const data = [
          { id: '1', name: 'Test', value: 100 },
          { id: '2', name: 'Test2' }, // missing 'value'
        ];

        const result = objectsToCSV(data);
        const lines = result.split('\n');

        expect(lines[2]).toBe('2,Test2,');
      });
    });

    describe('type conversion', () => {
      it('should convert numbers to strings', () => {
        const data = [{ id: 1, value: 123.45, count: 0 }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,123.45,0');
      });

      it('should convert booleans to strings', () => {
        const data = [{ id: '1', active: true, deleted: false }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,true,false');
      });

      it('should handle arrays by converting to string', () => {
        const data = [{ id: '1', tags: ['a', 'b', 'c'] }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines[1]).toBe('1,"a,b,c"');
      });

      it('should handle objects by converting to string', () => {
        const data = [{ id: '1', meta: { key: 'value' } }];
        const result = objectsToCSV(data);
        
        expect(result).toContain('[object Object]');
      });
    });

    describe('edge cases', () => {
      it('should handle single object', () => {
        const data = [{ id: '1', name: 'Single' }];
        const result = objectsToCSV(data);
        
        const lines = result.split('\n');
        expect(lines).toHaveLength(2);
      });

      it('should handle empty objects', () => {
        const data = [{}, {}];
        const result = objectsToCSV(data);
        
        // Empty objects result in empty header and empty rows
        expect(result).toBe('\n\n');
      });

      it('should handle objects with different keys', () => {
        const data = [
          { id: '1', name: 'Test' },
          { id: '2', name: 'Test2', extra: 'value' },
        ];

        const result = objectsToCSV(data);
        const lines = result.split('\n');

        expect(lines[0]).toBe('id,name');
        expect(lines[1]).toBe('1,Test');
        expect(lines[2]).toBe('2,Test2');
      });
    });
  });
});