import { LLMAdapter, LLMError } from './adapter.interface.js';

const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1';
const TIMEOUT_MS = 30_000;

export class ClaudeAdapter implements LLMAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(prompt: string, context: string): Promise<string> {
    const url = `${CLAUDE_BASE_URL}/messages`;

    const body = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Context:\n${context}\n\nUser question:\n${prompt}`
        }
      ]
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
    };
    const text = data?.content?.[0]?.text;

    if (!text) {
      throw new LLMError(
        'No response content from Claude',
        'PROVIDER_ERROR',
        'claude'
      );
    }

    return text;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const url = `${CLAUDE_BASE_URL}/messages`;
      const body = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      };

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
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
        throw new LLMError('Request timed out after 30 seconds', 'TIMEOUT', 'claude');
      }
      throw new LLMError(
        `Failed to connect to Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'claude'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401) {
      throw new LLMError('Invalid API key for Claude', 'INVALID_KEY', 'claude');
    }

    if (status === 429) {
      throw new LLMError('Claude API quota exceeded', 'QUOTA_EXCEEDED', 'claude');
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    throw new LLMError(
      `Claude API error (${status}): ${errorText}`,
      'PROVIDER_ERROR',
      'claude'
    );
  }
}
