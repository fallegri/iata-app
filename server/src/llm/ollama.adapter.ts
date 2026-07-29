import { LLMAdapter, LLMError } from './adapter.interface.js';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const TIMEOUT_MS = 30_000;

export class OllamaAdapter implements LLMAdapter {
  private readonly baseUrl: string;

  constructor(apiKey: string) {
    // apiKey is ignored for Ollama; baseUrl can be customized via env
    this.baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL;
  }

  async chat(prompt: string, context: string): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;

    const body = {
      model: 'llama3',
      messages: [
        { role: 'system', content: `Context:\n${context}` },
        { role: 'user', content: prompt }
      ],
      stream: false
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
      message?: { content?: string };
    };
    const text = data?.message?.content;

    if (!text) {
      throw new LLMError(
        'No response content from Ollama',
        'PROVIDER_ERROR',
        'ollama'
      );
    }

    return text;
  }

  async validateKey(_apiKey: string): Promise<boolean> {
    try {
      // Ollama doesn't use API keys; validate by checking the server is reachable
      const url = `${this.baseUrl}/api/tags`;
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
        throw new LLMError('Request timed out after 30 seconds', 'TIMEOUT', 'ollama');
      }
      throw new LLMError(
        `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'ollama'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401 || status === 403) {
      throw new LLMError('Invalid API key for Ollama', 'INVALID_KEY', 'ollama');
    }

    if (status === 429) {
      throw new LLMError('Ollama API quota exceeded', 'QUOTA_EXCEEDED', 'ollama');
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    throw new LLMError(
      `Ollama error (${status}): ${errorText}`,
      'PROVIDER_ERROR',
      'ollama'
    );
  }
}
