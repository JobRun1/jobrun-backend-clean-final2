const API_BASE_URL = 'http://localhost:3001/api/admin';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
        await response.json().catch(() => null)
      );
    }

    const json = await response.json();

    if (!json.success) {
      throw new ApiError(
        response.status,
        json.error?.message || 'API request failed',
        json.error
      );
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
        await response.json().catch(() => null)
      );
    }

    const json = await response.json();

    if (!json.success) {
      throw new ApiError(
        response.status,
        json.error?.message || 'API request failed',
        json.error
      );
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
