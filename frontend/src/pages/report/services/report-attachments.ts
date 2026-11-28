import { File as LocalFile } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import { apiRequest } from '@/services/api-client';
import type { IncidentAttachment } from '@/types/incidents';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function canUploadAttachments(platform = process.env.EXPO_OS) {
  return platform === 'ios' || platform === 'android';
}

export type ReportAttachment = {
  key: string;
  uri: string;
  name: string;
  size: number;
  mimeType: 'image/jpeg' | 'image/png' | 'video/mp4' | 'video/quicktime';
  kind: 'image' | 'video';
  file?: File;
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

export async function uploadAttachment(incidentId: string, attachment: ReportAttachment) {
  if (!canUploadAttachments()) {
    throw new Error('Los archivos solo se pueden adjuntar desde la aplicación móvil.');
  }
  const body = new FormData();
  if (attachment.file) {
    body.append('file', attachment.file, attachment.name);
  } else {
    let bytes: Uint8Array;
    try {
      bytes = await new LocalFile(attachment.uri).bytes();
    } catch (error) {
      throw new Error('No se ha podido leer el archivo seleccionado.', { cause: error });
    }
    if (!bytes.byteLength) throw new Error('El archivo está vacío.');
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new Error('Cada archivo puede ocupar como máximo 10 MiB.');
    // Expo fetch encodes file parts through bytes(), with the original name and MIME type.
    body.append('file', {
      name: attachment.name,
      type: attachment.mimeType,
      bytes: () => bytes,
    } as unknown as Blob);
  }
  return apiRequest<IncidentAttachment>(
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
    try {
      await upload(incidentId, attachment);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Vuelve a intentarlo.';
      throw new Error(`No se pudo subir «${attachment.name}». ${detail}`, { cause: error });
    }
    uploaded.add(attachment.key);
    onUploaded();
  }
}
