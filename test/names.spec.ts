import { describe, expect, it } from 'vitest';
import { generateDisplayName } from '../scripts/names';
import { getProviderDisplayName } from '../scripts/providers';

describe('name generation utilities', () => {
  describe('generateDisplayName', () => {
    describe('predefined display names', () => {
      it('should return predefined names for OpenAI models', () => {
        expect(generateDisplayName('gpt-4o')).toBe('GPT-4o');
        expect(generateDisplayName('gpt-4')).toBe('GPT-4');
        expect(generateDisplayName('gpt-4-turbo')).toBe('GPT-4 Turbo');
        expect(generateDisplayName('gpt-3.5-turbo')).toBe('GPT 3.5T');
        expect(generateDisplayName('o1')).toBe('o1');
        expect(generateDisplayName('o1-mini')).toBe('o1 mini');
      });

      it('should return predefined names for Anthropic models', () => {
        expect(generateDisplayName('claude-sonnet-4-20250514')).toBe(
          'Claude 4 Sonnet'
        );
        expect(generateDisplayName('claude-3-opus-latest')).toBe(
          'Claude 3 Opus'
        );
        expect(generateDisplayName('claude-3-haiku-20240307')).toBe(
          'Claude 3 Haiku'
        );
        expect(generateDisplayName('claude-instant-1.2')).toBe(
          'Claude Instant 1.2'
        );
      });

      it('should return predefined names for Google models', () => {
        expect(generateDisplayName('gemini-2.5-flash')).toBe(
          'Gemini 2.5 Flash'
        );
        expect(generateDisplayName('gemini-1.5-pro')).toBe('Gemini 1.5 Pro');
        expect(generateDisplayName('gemini-pro')).toBe('Gemini Pro');
      });

      it('should return predefined names for Meta/Llama models', () => {
        expect(generateDisplayName('llama-3.3-70b-instruct-turbo')).toBe(
          'Llama 3.3 70B Instruct Turbo'
        );
        expect(generateDisplayName('llama3-70b')).toBe('Llama 3 70B');
        expect(generateDisplayName('llama-2-70b-chat')).toBe(
          'LLaMA 2 70b Chat'
        );
      });

      it('should return predefined names for Mistral models', () => {
        expect(generateDisplayName('mistral-large-latest')).toBe(
          'Mistral Large'
        );
        expect(generateDisplayName('mistral-7b')).toBe('Mistral 7B');
        expect(generateDisplayName('mixtral-8x7b')).toBe('Mixtral 8x7b');
        expect(generateDisplayName('codestral-latest')).toBe('Codestral');
      });
    });

    describe('slash-separated model IDs', () => {
      it('should handle provider/model format', () => {
        expect(generateDisplayName('openai/gpt-4')).toBe('GPT-4');
        expect(generateDisplayName('anthropic/claude-3-opus-latest')).toBe(
          'Claude 3 Opus'
        );
        expect(generateDisplayName('google/gemini-pro')).toBe('Gemini Pro');
      });

      it('should handle unknown models with provider prefix', () => {
        expect(generateDisplayName('unknown/some-new-model')).toBe(
          'Some New Model'
        );
        expect(generateDisplayName('provider/test-model-v2')).toBe(
          'Test Model V2'
        );
      });

      it('should handle multiple slashes', () => {
        expect(generateDisplayName('org/provider/gpt-4')).toBe('GPT-4');
        expect(generateDisplayName('a/b/c/unknown-model')).toBe(
          'Unknown Model'
        );
      });
    });

    describe('fine-tuned models', () => {
      it('should handle base model without ft: prefix', () => {
        expect(generateDisplayName('gpt-4o-mini-2024-07-18')).toBe(
          'GPT-4o mini (Jul 2024)'
        );
        expect(generateDisplayName('gpt-3.5-turbo')).toBe('GPT 3.5T');
        expect(generateDisplayName('gpt-4')).toBe('GPT-4');
      });

      it('should add [Fine-tuned] suffix to models with ft: prefix', () => {
        expect(generateDisplayName('ft:gpt-4o-mini-2024-07-18')).toBe(
          'GPT-4o mini (Jul 2024) [Fine-tuned]'
        );
        expect(generateDisplayName('ft:gpt-3.5-turbo')).toBe(
          'GPT 3.5T [Fine-tuned]'
        );
        expect(generateDisplayName('ft:gpt-4')).toBe('GPT-4 [Fine-tuned]');
      });

      it('should handle fine-tuned models with auto-generated names', () => {
        expect(generateDisplayName('ft:unknown-model-v2')).toBe(
          'Unknown Model V2 [Fine-tuned]'
        );
        expect(generateDisplayName('ft:new-test-model')).toBe(
          'New Test Model [Fine-tuned]'
        );
      });

      it('should handle fine-tuned Anthropic models', () => {
        expect(generateDisplayName('ft:claude-3-opus-20240229')).toBe(
          'Claude 3 Opus (Feb 2024) [Fine-tuned]'
        );
      });
    });

    describe('auto-generated names', () => {
      it('should capitalize words separated by hyphens', () => {
        expect(generateDisplayName('new-model-name')).toBe('New Model Name');
        expect(generateDisplayName('test-v1-beta')).toBe('Test V1 Beta');
      });

      it('should handle GPT capitalization with hyphen', () => {
        expect(generateDisplayName('gpt-unknown')).toBe('GPT Unknown');
        expect(generateDisplayName('new-gpt-model')).toBe('New GPT Model');
        // Single word without hyphens - title-cased but GPT regex uses word boundaries
        expect(generateDisplayName('gptmodel')).toBe('Gptmodel');
      });

      it('should format GPT-N with hyphen (GPT-5, GPT-6, etc.)', () => {
        expect(generateDisplayName('gpt-5')).toBe('GPT-5');
        expect(generateDisplayName('gpt-5-mini')).toBe('GPT-5 Mini');
        expect(generateDisplayName('gpt-5-nano')).toBe('GPT-5 Nano');
        expect(generateDisplayName('gpt-6')).toBe('GPT-6');
        // Decimal versions should also have hyphen
        expect(generateDisplayName('gpt-5.1')).toBe('GPT-5.1');
        expect(generateDisplayName('gpt-5.1-codex')).toBe('GPT-5.1 Codex');
      });

      it('should handle single word models', () => {
        expect(generateDisplayName('testmodel')).toBe('Testmodel');
        expect(generateDisplayName('MODEL')).toBe('MODEL');
      });

      it('should handle empty segments', () => {
        expect(generateDisplayName('model--name')).toBe('Model  Name');
        expect(generateDisplayName('-start')).toBe(' Start');
        expect(generateDisplayName('end-')).toBe('End ');
      });
    });

    describe('date pattern detection', () => {
      it('should detect and format YYYY-MM-DD date patterns', () => {
        expect(generateDisplayName('gpt-5-2025-08-07')).toBe('GPT-5 (Aug 2025)');
        expect(generateDisplayName('gpt-5-mini-2025-08-07')).toBe(
          'GPT-5 Mini (Aug 2025)'
        );
        expect(generateDisplayName('model-2024-01-15')).toBe(
          'Model (Jan 2024)'
        );
        expect(generateDisplayName('test-2023-12-31')).toBe(
          'Test (Dec 2023)'
        );
      });

      it('should detect and format YYMM short date patterns', () => {
        expect(generateDisplayName('mistral-small-2501')).toBe(
          'Mistral Small (Jan 2025)'
        );
        expect(generateDisplayName('model-2412')).toBe('Model (Dec 2024)');
      });

      it('should handle date patterns in slash-separated IDs', () => {
        expect(generateDisplayName('azure/gpt-5-2025-08-07')).toBe(
          'GPT-5 (Aug 2025)'
        );
        expect(generateDisplayName('openrouter/openai/gpt-5-mini-2025-08-07')).toBe(
          'GPT-5 Mini (Aug 2025)'
        );
      });

      it('should use dictionary name with date suffix when base is in dictionary', () => {
        // gpt-4o is in dictionary as "GPT-4o"
        expect(generateDisplayName('gpt-4o-2024-11-20')).toBe(
          'GPT-4o (Nov 2024)'
        );
      });

      it('should handle fine-tuned models with dates', () => {
        expect(generateDisplayName('ft:gpt-5-2025-08-07')).toBe(
          'GPT-5 (Aug 2025) [Fine-tuned]'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(generateDisplayName('')).toBe('');
      });

      it('should handle models with numbers', () => {
        expect(generateDisplayName('model-123')).toBe('Model 123');
        expect(generateDisplayName('v2-456-beta')).toBe('V2 456 Beta');
      });

      it('should handle special characters', () => {
        expect(generateDisplayName('model_with_underscores')).toBe(
          'Model_with_underscores'
        );
        expect(generateDisplayName('model.with.dots')).toBe('Model.with.dots');
      });
    });
  });

  describe('getProviderDisplayName', () => {
    describe('predefined provider names', () => {
      it('should return predefined names for major providers', () => {
        expect(getProviderDisplayName('openai')).toBe('OpenAI');
        expect(getProviderDisplayName('anthropic')).toBe('Anthropic');
        expect(getProviderDisplayName('google')).toBe('Google');
        expect(getProviderDisplayName('meta')).toBe('Meta');
        expect(getProviderDisplayName('mistral')).toBe('Mistral AI');
        expect(getProviderDisplayName('xai')).toBe('xAI');
        expect(getProviderDisplayName('deepseek')).toBe('DeepSeek');
      });

      it('should return predefined names for cloud providers', () => {
        expect(getProviderDisplayName('bedrock')).toBe('AWS Bedrock');
        expect(getProviderDisplayName('aws')).toBe('AWS');
        expect(getProviderDisplayName('azure')).toBe('Microsoft Azure');
        expect(getProviderDisplayName('vertex')).toBe('Google Vertex AI');
        expect(getProviderDisplayName('databricks')).toBe('Databricks');
      });

      it('should return predefined names for other providers', () => {
        expect(getProviderDisplayName('cohere')).toBe('Cohere');
        expect(getProviderDisplayName('huggingface')).toBe('Hugging Face');
        expect(getProviderDisplayName('perplexity')).toBe('Perplexity AI');
        expect(getProviderDisplayName('voyage')).toBe('Voyage AI');
      });

      it('should handle case insensitivity', () => {
        expect(getProviderDisplayName('OpenAI')).toBe('OpenAI');
        expect(getProviderDisplayName('ANTHROPIC')).toBe('Anthropic');
        expect(getProviderDisplayName('GoOgLe')).toBe('Google');
      });
    });

    describe('text-completion prefixed providers', () => {
      it('should extract provider from text-completion prefix', () => {
        expect(getProviderDisplayName('text-completion-openai')).toBe('OpenAI');
        expect(getProviderDisplayName('text-completion-anthropic')).toBe(
          'Anthropic'
        );
        expect(getProviderDisplayName('text-completion-cohere')).toBe('Cohere');
      });

      it('should handle unknown text-completion providers', () => {
        expect(getProviderDisplayName('text-completion-unknown')).toBe(
          'Text Completion Unknown'
        );
      });
    });

    describe('auto-generated provider names', () => {
      it('should capitalize words separated by hyphens', () => {
        expect(getProviderDisplayName('new-provider')).toBe('New Provider');
        expect(getProviderDisplayName('test-ai-company')).toBe(
          'Test AI Company'
        );
      });

      it('should capitalize words separated by underscores', () => {
        expect(getProviderDisplayName('new_provider')).toBe('New Provider');
        expect(getProviderDisplayName('test_ai_company')).toBe(
          'Test AI Company'
        );
      });

      it('should handle special abbreviations', () => {
        expect(getProviderDisplayName('custom-ai')).toBe('Custom AI');
        expect(getProviderDisplayName('new-llm')).toBe('New LLM');
        expect(getProviderDisplayName('test-api')).toBe('Test API');
        expect(getProviderDisplayName('ml-provider')).toBe('ML Provider');
      });

      it('should handle mixed separators', () => {
        expect(getProviderDisplayName('new-ai_provider')).toBe(
          'New AI Provider'
        );
        expect(getProviderDisplayName('test_provider-ai')).toBe(
          'Test Provider AI'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(getProviderDisplayName('')).toBe('');
      });

      it('should handle single word providers', () => {
        expect(getProviderDisplayName('provider')).toBe('Provider');
        expect(getProviderDisplayName('AI')).toBe('AI');
      });

      it('should handle providers with numbers', () => {
        expect(getProviderDisplayName('provider-123')).toBe('Provider 123');
        expect(getProviderDisplayName('ai21')).toBe('AI21 Labs');
        expect(getProviderDisplayName('test-v2')).toBe('Test V2');
      });

      it('should handle empty segments', () => {
        expect(getProviderDisplayName('provider--name')).toBe('Provider  Name');
        expect(getProviderDisplayName('-start')).toBe(' Start');
        expect(getProviderDisplayName('end-')).toBe('End ');
      });

      it('should preserve correct casing for known abbreviations', () => {
        expect(getProviderDisplayName('custom-ai-llm-api-ml')).toBe(
          'Custom AI LLM API ML'
        );
      });
    });
  });
});
