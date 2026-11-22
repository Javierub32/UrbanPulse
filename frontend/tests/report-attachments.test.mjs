import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === '@/services/api-client'
    ? new URL('../src/services/api-client.ts', import.meta.url).href : specifier, context);
} });

const { prepareAttachments, uploadAttachment, uploadPendingAttachments, MAX_ATTACHMENT_BYTES } = await import('../src/pages/report/services/report-attachments.ts');
const { setApiSession } = await import('../src/services/api-client.ts');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; setApiSession(null); });

const asset = (name, size, type = 'image') => ({ uri: `file:///cache/${name}`, fileName: name, fileSize: size, type });

test('acepta JPEG, PNG, MP4 y MOV hasta el límite exacto', () => {
  const selected = prepareAttachments([
    asset('calle.jpg', 100), asset('senal.PNG', MAX_ATTACHMENT_BYTES),
    asset('clip.mp4', 1024, 'video'), asset('clip.MOV', 2048, 'video'),
  ], 0);
  assert.deepEqual(selected.map(item => item.mimeType), ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime']);
  assert.deepEqual(selected.map(item => item.kind), ['image', 'image', 'video', 'video']);
});

test('rechaza archivos no permitidos, vacíos, demasiado grandes o más de cinco', () => {
  assert.throws(() => prepareAttachments([asset('documento.pdf', 10)], 0), /Solo se permiten/);
  assert.throws(() => prepareAttachments([asset('foto.heic', 10)], 0), /Solo se permiten/);
  assert.throws(() => prepareAttachments([asset('foto.jpg', 0)], 0), /vacío/);
  assert.throws(() => prepareAttachments([asset('foto.jpg', MAX_ATTACHMENT_BYTES + 1)], 0), /10 MiB/);
  assert.throws(() => prepareAttachments([asset('foto.jpg', 10)], 5), /hasta 5/);
});

test('envía multipart con Bearer y deja que fetch genere el boundary', async () => {
  const file = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' });
  const [attachment] = prepareAttachments([{ ...asset('foto.jpg', file.size), file }], 0);
  setApiSession('token-ciudadano');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/incidents/incident-id/attachments'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.get('Authorization'), 'Bearer token-ciudadano');
    assert.equal(options.headers.get('Content-Type'), null);
    assert.equal(options.body.get('file').name, 'foto.jpg');
    return Response.json({ id: 'attachment-id' }, { status: 201 });
  };
  assert.deepEqual(await uploadAttachment('incident-id', attachment), { id: 'attachment-id' });
});

test('tras un fallo, reintenta solo los adjuntos que faltan', async () => {
  const attachments = prepareAttachments([asset('uno.jpg', 10), asset('dos.png', 20)], 0);
  const uploaded = new Set();
  const calls = [];
  let fail = true;
  const upload = async (_incidentId, attachment) => {
    calls.push(attachment.name);
    if (attachment.name === 'dos.png' && fail) throw new Error('red interrumpida');
  };
  await assert.rejects(uploadPendingAttachments('incident-id', attachments, uploaded, () => {}, upload), /red interrumpida/);
  assert.deepEqual([...uploaded], [attachments[0].key]);
  fail = false;
  await uploadPendingAttachments('incident-id', attachments, uploaded, () => {}, upload);
  assert.deepEqual(calls, ['uno.jpg', 'dos.png', 'dos.png']);
});
