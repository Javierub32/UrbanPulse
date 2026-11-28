import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

const expoPackage = import.meta.resolve('expo/package.json');
const encoderUrl = new URL('./src/winter/fetch/convertFormData.ts', expoPackage).href;
const blobUtilsUrl = new URL('./src/utils/blobUtils.ts', expoPackage).href;
const nativeFileStub = 'data:text/javascript,' + encodeURIComponent(`
  export class File {
    constructor(uri) { this.uri = uri; }
    async bytes() {
      if (this.uri !== 'file:///cache/id-android.jpg') throw new Error('No se puede leer el fichero');
      return new TextEncoder().encode('bytes de prueba');
    }
  }
`);

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-file-system') return nextResolve(nativeFileStub, context);
  if (specifier === '../../utils/blobUtils' && context.parentURL === encoderUrl) return nextResolve(blobUtilsUrl, context);
  return nextResolve(specifier === '@/services/api-client'
    ? new URL('../src/services/api-client.ts', import.meta.url).href : specifier, context);
}, load(url, context, nextLoad) {
  if (url === encoderUrl || url === blobUtilsUrl) {
    return { format: 'module', source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8')), shortCircuit: true };
  }
  return nextLoad(url, context);
} });

const { canUploadAttachments, prepareAttachments, uploadAttachment, uploadPendingAttachments, MAX_ATTACHMENT_BYTES } = await import('../src/pages/report/services/report-attachments.ts');
const { setApiSession } = await import('../src/services/api-client.ts');
const { convertFormDataAsync } = await import(encoderUrl);
const originalFetch = globalThis.fetch;
const originalFormData = globalThis.FormData;
const originalExpoOs = process.env.EXPO_OS;
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.FormData = originalFormData;
  if (originalExpoOs === undefined) delete process.env.EXPO_OS;
  else process.env.EXPO_OS = originalExpoOs;
  setApiSession(null);
});

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
  process.env.EXPO_OS = 'android';
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

test('impide subir adjuntos desde la web', async () => {
  assert.equal(canUploadAttachments('ios'), true);
  assert.equal(canUploadAttachments('android'), true);
  assert.equal(canUploadAttachments('web'), false);
  process.env.EXPO_OS = 'web';
  globalThis.fetch = () => { throw new Error('La web no debe enviar el archivo.'); };
  const [attachment] = prepareAttachments([asset('foto.jpg', 10)], 0);
  await assert.rejects(uploadAttachment('incident-id', attachment), /aplicación móvil/);
});

test('el codificador multipart de Expo acepta los bytes de una foto seleccionada en Android', async () => {
  process.env.EXPO_OS = 'android';
  const contents = 'bytes de prueba';
  const [attachment] = prepareAttachments([{ ...asset('foto.jpg', contents.length), uri: 'file:///cache/id-android.jpg' }], 0);
  globalThis.FormData = class {
    parts = [];
    append(name, value) { this.parts.push([name, value]); }
    entries() { return this.parts[Symbol.iterator](); }
  };
  let encodingError;
  setApiSession('token-ciudadano');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer token-ciudadano');
    try {
      const { body, boundary } = await convertFormDataAsync(options.body);
      assert.equal(new TextDecoder().decode(body),
        `--${boundary}\r\ncontent-disposition: form-data; name="file"; filename="foto.jpg"\r\ncontent-type: image/jpeg\r\n\r\n${contents}\r\n--${boundary}--\r\n`);
      return Response.json({ id: 'attachment-id' }, { status: 201 });
    } catch (error) {
      encodingError = error;
      throw error;
    }
  };
  const uploaded = await uploadAttachment('incident-id', attachment).catch(error => { throw encodingError ?? error; });
  assert.deepEqual(uploaded, { id: 'attachment-id' });
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
  await assert.rejects(uploadPendingAttachments('incident-id', attachments, uploaded, () => {}, upload), /dos\.png.*red interrumpida/);
  assert.deepEqual([...uploaded], [attachments[0].key]);
  await uploadPendingAttachments('incident-id', [attachments[0]], uploaded, () => {}, upload);
  assert.deepEqual(calls, ['uno.jpg', 'dos.png']);
  fail = false;
  await uploadPendingAttachments('incident-id', attachments, uploaded, () => {}, upload);
  assert.deepEqual(calls, ['uno.jpg', 'dos.png', 'dos.png']);
});
