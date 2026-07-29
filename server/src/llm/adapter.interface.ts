/**
 * Interface for LLM provider adapters.
 * Each provider implements this interface to standardize AI interactions.
 */
export interface LLMAdapter {
  /**
   * Sends a chat prompt with context to the LLM provider.
   * @param prompt - The user's question or instruction
   * @param context - Additional context (e.g., course declarations summary)
   * @returns The LLM's response text
   * @throws LLMError on failure (timeout, invalid key, quota)
   */
  chat(prompt: string, context: string): Promise<string>;

  /**
   * Validates that the given API key works with the provider.
   * Attempts a minimal API call to verify the key is accepted.
   * @param apiKey - The API key to validate
   * @returns true if the key is valid, false otherwise
   */
  validateKey(apiKey: string): Promise<boolean>;
}

export type LLMProvider = 'gemini' | 'claude' | 'grok' | 'nvidia' | 'ollama';

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_KEY' | 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'PROVIDER_ERROR',
    public readonly provider: string
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
