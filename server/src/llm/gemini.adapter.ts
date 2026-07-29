import { LLMAdapter, LLMError } from './adapter.interface.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 30_000;

export class GeminiAdapter implements LLMAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(prompt: string, context: string): Promise<string> {
    const url = `${GEMINI_BASE_URL}/models/gemini-pro:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: `Context:\n${context}\n\nUser question:\n${prompt}` }
          ]
        }
      ]
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new LLMError(
        'No response content from Gemini',
        'PROVIDER_ERROR',
        'gemini'
      );
    }

    return text;
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const url = `${GEMINI_BASE_URL}/models?key=${apiKey}`;
      const response = await this.fetchWithTimeout(url, { method: 'GET' });
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
        throw new LLMError('Request timed out after 30 seconds', 'TIMEOUT', 'gemini');
      }
      throw new LLMError(
        `Failed to connect to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'gemini'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401 || status === 403) {
      throw new LLMError('Invalid API key for Gemini', 'INVALID_KEY', 'gemini');
    }

    if (status === 429) {
      throw new LLMError('Gemini API quota exceeded', 'QUOTA_EXCEEDED', 'gemini');
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    throw new LLMError(
      `Gemini API error (${status}): ${errorText}`,
      'PROVIDER_ERROR',
      'gemini'
    );
  }
}
