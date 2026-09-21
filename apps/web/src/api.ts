import type { CandidateListStatus, DealCandidate, InternalVenue, PublicationResult } from './types';

const configuredBaseUrl = import.meta.env.VITE_INTERNAL_API_URL?.trim() || '/api';
const apiBaseUrl = configuredBaseUrl.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function listCandidates(status: CandidateListStatus) {
  const response = await request<{ candidates: DealCandidate[] }>(
    `/internal/deal-candidates?status=${encodeURIComponent(status)}`
  );
  return response.candidates;
}

export async function listVenues(query = '') {
  const response = await request<{ venues: InternalVenue[] }>(
    `/internal/venues?query=${encodeURIComponent(query)}`
  );
  return response.venues;
}

export async function getCandidate(candidateId: string) {
  const response = await request<{ candidate: DealCandidate }>(
    `/internal/deal-candidates/${encodeURIComponent(candidateId)}`
  );
  return response.candidate;
}

export async function approveCandidate(candidateId: string) {
  await request(`/internal/deal-candidates/${encodeURIComponent(candidateId)}/approve`, {
    method: 'POST'
  });
}

export async function rejectCandidate(candidateId: string, reviewNote: string) {
  await request(`/internal/deal-candidates/${encodeURIComponent(candidateId)}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reviewNote: reviewNote.trim() || null })
  });
}

export async function assignCandidateVenue(candidateId: string, venueId: string) {
  await request(`/internal/deal-candidates/${encodeURIComponent(candidateId)}/venue`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ venueId })
  });
}

export function publishCandidate(candidateId: string) {
  return request<PublicationResult>(
    `/internal/deal-candidates/${encodeURIComponent(candidateId)}/publish`,
    { method: 'POST' }
  );
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...init?.headers
      }
    });
  } catch {
    throw new ApiError('Unable to reach the API. Confirm the local API is running.', 0);
  }

  const body = await parseJson(response);

  if (!response.ok) {
    const error = readString(body, 'error') ?? `Request failed (${response.status})`;
    const reason = readString(body, 'reason');
    throw new ApiError(reason ? `${error}: ${reason}` : error, response.status);
  }

  return body as T;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError('The API returned an invalid response.', response.status);
    }
    return null;
  }
}

function readString(value: unknown, key: string) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === 'string' ? property : null;
}
