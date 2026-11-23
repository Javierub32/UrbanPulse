import { apiRequest, apiUrlForPath } from '@/services/api-client';
import type { IncidentAttachment, IncidentDetail } from '@/types/incidents';

export function getIncidentDetail(id: string, signal?: AbortSignal) {
  return apiRequest<IncidentDetail>(`/api/incidents/${encodeURIComponent(id)}`, { signal });
}

function attachmentPath(incidentId: string, attachmentId?: string) {
  const base = `/api/incidents/${encodeURIComponent(incidentId)}/attachments`;
  return attachmentId ? `${base}/${encodeURIComponent(attachmentId)}` : base;
}

export function getIncidentAttachments(id: string, signal?: AbortSignal) {
  return apiRequest<IncidentAttachment[]>(attachmentPath(id), { signal });
}

export function getAttachmentBlob(incidentId: string, attachmentId: string, signal?: AbortSignal) {
  return apiRequest<Blob>(attachmentPath(incidentId, attachmentId), { signal }, true, 'blob');
}

export function getAttachmentSource(incidentId: string, attachmentId: string, token: string) {
  return {
    uri: apiUrlForPath(attachmentPath(incidentId, attachmentId)),
    headers: { Authorization: `Bearer ${token}` },
  };
}
