import { apiRequest } from '@/services/api-client';

export type AssignmentDestination = { department: string } | { team: string } | { technicianId: string };

type TechnicianOption = { id: string; name: string | null };

export function getAssignmentTechnicians(signal: AbortSignal) {
  return apiRequest<TechnicianOption[]>('/api/operator/assignments/technicians', { signal });
}

export type ReviewCommand =
  | { action: 'edit'; body: { category: string; priority: string; latitude: number; longitude: number } }
  | { action: 'request-information' | 'reject'; body: { reason: string } }
  | { action: 'validate' }
  | { action: 'assign'; body: AssignmentDestination };

export function submitReview(id: string, command: ReviewCommand) {
  if (command.action === 'assign') {
    return apiRequest<null>('/api/operator/assignments/' + encodeURIComponent(id), {
      method: 'POST',
      body: JSON.stringify(command.body),
    });
  }
  const body = 'body' in command ? JSON.stringify(command.body) : undefined;
  return apiRequest<null>(`/api/operator/reviews/${encodeURIComponent(id)}/${command.action}`, { method: 'POST', body });
}
