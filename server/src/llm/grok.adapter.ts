import { LLMAdapter, LLMError } from './adapter.interface.js';

const GROK_BASE_URL = 'https://api.x.ai/v1';
const TIMEOUT_MS = 30_000;

export class GrokAdapter implements LLMAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(prompt: string, context: string): Promise<string> {
    const url = `${GROK_BASE_URL}/chat/completions`;

    const body = {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: `Context:\n${context}` },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new LLMError(
        'No response content from Grok',
        'PROVIDER_ERROR',
        'grok'
      );
    }

    return text;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const url = `${GROK_BASE_URL}/chat/completions`;
      const body = {
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      };

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMError('Request timed out after 30 seconds', 'TIMEOUT', 'grok');
      }
      throw new LLMError(
        `Failed to connect to Grok: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'grok'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401) {
      throw new LLMError('Invalid API key for Grok', 'INVALID_KEY', 'grok');
    }

    if (status === 429) {
      throw new LLMError('Grok API quota exceeded', 'QUOTA_EXCEEDED', 'grok');
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    throw new LLMError(
      `Grok API error (${status}): ${errorText}`,
      'PROVIDER_ERROR',
      'grok'
    );
  }
}
