const TOKEN_KEY = 'iata_token';

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; rule: string; message: string }>;
}

export class ApiRequestError extends Error {
  public status: number;
  public error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.error = error;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorBody: { error?: ApiError } | undefined;
    try {
      errorBody = await response.json();
    } catch {
      // response body is not JSON
    }

    const apiError: ApiError = errorBody?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: `Error ${response.status}: ${response.statusText}`,
    };

    throw new ApiRequestError(response.status, apiError);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(url: string): Promise<T> {
    return request<T>('GET', url);
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>('POST', url, body);
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>('PUT', url, body);
  },

  delete<T>(url: string): Promise<T> {
    return request<T>('DELETE', url);
  },
};
