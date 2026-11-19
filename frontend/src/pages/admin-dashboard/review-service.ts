import { apiRequest } from '@/services/api-client';

export type ReviewCommand =
  | { action: 'edit'; body: { category: string; priority: string; latitude: number; longitude: number } }
  | { action: 'request-information' | 'reject'; body: { reason: string } }
  | { action: 'validate' };

export function submitReview(id: string, command: ReviewCommand) {
  const body = 'body' in command ? JSON.stringify(command.body) : undefined;
  return apiRequest<null>(`/api/operator/reviews/${encodeURIComponent(id)}/${command.action}`, { method: 'POST', body });
}
