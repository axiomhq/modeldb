import type { Model, ModelsPartial } from './schema';

/**
 * Check if a field name indicates it should contain numeric values
 */
function isNumericField(fieldName: string): boolean {
  const numericPatterns = ['tokens', 'cost', 'million'];

  const lowerFieldName = fieldName.toLowerCase();
  return numericPatterns.some((pattern) => lowerFieldName.includes(pattern));
}

/**
 * Replace null values with 0 for numeric fields in the model
 */
export function fillNullsWithZeros<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => fillNullsWithZeros(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null && isNumericField(key)) {
        // Replace null with 0 for fields that look numeric
        result[key] = 0;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = fillNullsWithZeros(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Project specific fields from a model
 */
export function projectModelFields(
  model: Model | ModelsPartial,
  fields: string[]
): ModelsPartial {
  const projectedModel: ModelsPartial = {};
  for (const field of fields) {
    if (field in model) {
      // @ts-expect-error - we know the field exists
      projectedModel[field] = model[field as keyof typeof model];
    }
  }
  return projectedModel;
}

/**
 * Project specific fields from an array of models
 */
export function projectModelsFields(
  models: (Model | ModelsPartial)[],
  fields: string[]
): ModelsPartial[] {
  return models.map((model) => projectModelFields(model, fields));
}
