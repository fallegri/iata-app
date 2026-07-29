import { LLMAdapter, LLMProvider } from './adapter.interface.js';
import { GeminiAdapter } from './gemini.adapter.js';
import { ClaudeAdapter } from './claude.adapter.js';
import { GrokAdapter } from './grok.adapter.js';
import { NvidiaAdapter } from './nvidia.adapter.js';
import { OllamaAdapter } from './ollama.adapter.js';

/**
 * Factory function that creates the appropriate LLM adapter based on provider name.
 *
 * @param provider - One of: 'gemini', 'claude', 'grok', 'nvidia', 'ollama'
 * @param apiKey - The API key for the provider (ignored for Ollama)
 * @returns An LLMAdapter instance for the specified provider
 * @throws Error if the provider is not supported
 */
export function createLLMAdapter(provider: string, apiKey: string): LLMAdapter {
  switch (provider as LLMProvider) {
    case 'gemini':
      return new GeminiAdapter(apiKey);
    case 'claude':
      return new ClaudeAdapter(apiKey);
    case 'grok':
      return new GrokAdapter(apiKey);
    case 'nvidia':
      return new NvidiaAdapter(apiKey);
    case 'ollama':
      return new OllamaAdapter(apiKey);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}. Supported: gemini, claude, grok, nvidia, ollama`);
  }
}
