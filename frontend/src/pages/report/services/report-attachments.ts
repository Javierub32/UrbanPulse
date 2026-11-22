import type { ImagePickerAsset } from 'expo-image-picker';

import { apiRequest } from '@/services/api-client';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type ReportAttachment = {
  key: string;
  uri: string;
  name: string;
  size: number;
  mimeType: 'image/jpeg' | 'image/png' | 'video/mp4' | 'video/quicktime';
  kind: 'image' | 'video';
  file?: File;
};

export type AttachmentResponse = {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
};

const formats = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
} as const;

function attachmentFormat(asset: ImagePickerAsset) {
  const name = asset.fileName ?? asset.file?.name ?? '';
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension && extension in formats) return formats[extension as keyof typeof formats];
  if (!name || !name.includes('.')) {
    const mime = asset.mimeType?.toLowerCase();
    if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'video/mp4' || mime === 'video/quicktime') return mime;
  }
  return null;
}

export function prepareAttachments(assets: ImagePickerAsset[], existingCount: number): ReportAttachment[] {
  if (assets.length + existingCount > MAX_ATTACHMENTS) {
    throw new Error(`Puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos por incidencia.`);
  }
  return assets.map((asset, index) => {
    const mimeType = attachmentFormat(asset);
    if (!mimeType || (asset.type && (asset.type === 'video') !== mimeType.startsWith('video/'))) {
      throw new Error('Solo se permiten imágenes JPEG o PNG y vídeos MP4 o MOV.');
    }
    const size = asset.fileSize ?? asset.file?.size;
    if (size == null || !Number.isFinite(size)) {
      throw new Error('No se ha podido comprobar el tamaño del archivo. Selecciónalo de nuevo.');
    }
    if (size <= 0) throw new Error('El archivo está vacío.');
    if (size > MAX_ATTACHMENT_BYTES) throw new Error('Cada archivo puede ocupar como máximo 10 MiB.');
    const suffix = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : mimeType === 'video/mp4' ? 'mp4' : 'mov';
    return {
      key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      uri: asset.uri,
      name: asset.fileName ?? asset.file?.name ?? `adjunto-${index + 1}.${suffix}`,
      size,
      mimeType,
      kind: mimeType.startsWith('image/') ? 'image' : 'video',
      file: asset.file,
    };
  });
}

export function uploadAttachment(incidentId: string, attachment: ReportAttachment) {
  const body = new FormData();
  if (attachment.file) {
    body.append('file', attachment.file, attachment.name);
  } else {
    body.append('file', {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType,
    } as unknown as Blob);
  }
  return apiRequest<AttachmentResponse>(
    `/api/incidents/${encodeURIComponent(incidentId)}/attachments`,
    { method: 'POST', body },
  );
}

export async function uploadPendingAttachments(
  incidentId: string,
  attachments: ReportAttachment[],
  uploaded: Set<string>,
  onUploaded: () => void,
  upload = uploadAttachment,
) {
  for (const attachment of attachments) {
    if (uploaded.has(attachment.key)) continue;
    await upload(incidentId, attachment);
    uploaded.add(attachment.key);
    onUploaded();
  }
}
