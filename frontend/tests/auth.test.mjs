import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { ApiError, apiRequest, setApiSession } from '../src/services/api-client.ts';
import { createSessionWriter, readStoredSession, passwordBytes, validateRegistration } from '../src/services/session.ts';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === './api-client' ? './api-client.ts' : specifier === '@/services/api-client' ? new URL('../src/services/api-client.ts', import.meta.url).href : specifier, context);
} });
const authService = await import('../src/services/auth-service.ts');
const webStorage = await import('../src/services/token-storage.ts');
const { getIncidentDetail } = await import('../src/pages/incident-detail/services/incident-detail-service.ts');

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
afterEach(() => { globalThis.fetch = originalFetch; globalThis.window = originalWindow; setApiSession(null); });

test('consulta el detalle con la sesión y transmite errores', async () => {
  setApiSession('token');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/incidents/incident-id'));
    assert.equal(options.headers.get('Authorization'), 'Bearer token');
    return Response.json({ id: 'incident-id', history: [] });
  };
  assert.deepEqual(await getIncidentDetail('incident-id'), { id: 'incident-id', history: [] });
  globalThis.fetch = async () => Response.json({ detail: 'No encontrada' }, { status: 404 });
  await assert.rejects(getIncidentDetail('incident-id'), error => error instanceof ApiError && error.status === 404);
});

test('restaura solo credenciales válidas que todavía no hayan caducado', () => {
  assert.equal(readStoredSession(null), null);
  assert.equal(readStoredSession('{'), null);
  assert.equal(readStoredSession(JSON.stringify({ accessToken: 'abc', expiresAt: Date.now() - 1 })), null);
  assert.equal(readStoredSession(JSON.stringify({ accessToken: '', expiresAt: Date.now() + 10000 })), null);
  const session = { accessToken: 'abc', expiresAt: Date.now() + 10000 };
  assert.deepEqual(readStoredSession(JSON.stringify(session)), session);
});

test('valida confirmación, longitud Unicode y límite real de BCrypt', () => {
  assert.equal(passwordBytes('á'.repeat(36)), 72);
  assert.equal(passwordBytes('😀'.repeat(18)), 72);
  assert.deepEqual(validateRegistration(' Ana ', ' ana@example.com ', ' password ', ' password '), {});
  assert.ok(validateRegistration('', 'mal', '123', '456').name);
  assert.ok(validateRegistration('Ana', 'mal', '123', '456').email);
  assert.ok(validateRegistration('Ana', 'a@example.com', '😀'.repeat(4), '😀'.repeat(4)).password);
  assert.ok(validateRegistration('Ana', 'a@example.com', 'á'.repeat(37), 'á'.repeat(37)).password);
  assert.ok(validateRegistration('Ana', 'a@example.com', 'password1', 'password2').confirmation);
});

test('adjunta Bearer a peticiones privadas y no lo envía al login', async () => {
  const headers = [];
  globalThis.fetch = async (_url, options) => { headers.push(options.headers); return Response.json({ ok: true }); };
  setApiSession('token');
  await apiRequest('/api/auth/me');
  await apiRequest('/api/auth/login', { method: 'POST', body: '{}' }, false);
  assert.equal(headers[0].get('Authorization'), 'Bearer token');
  assert.equal(headers[1].get('Authorization'), null);
});

test('un 403 mantiene la sesión y un 401 la cierra', async () => {
  let expired = 0;
  setApiSession('token', () => expired++);
  globalThis.fetch = async () => Response.json({ detail: 'Sin permiso' }, { status: 403 });
  await assert.rejects(apiRequest('/private'), error => error instanceof ApiError && error.status === 403);
  assert.equal(expired, 0);
  globalThis.fetch = async () => Response.json({ detail: 'Caducado' }, { status: 401 });
  await assert.rejects(apiRequest('/private'), error => error.status === 401);
  assert.equal(expired, 1);
});

test('los fallos de red permiten reintentar sin borrar la sesión', async () => {
  let expired = false;
  setApiSession('token', () => { expired = true; });
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(apiRequest('/private'), error => error.status === 0);
  assert.equal(expired, false);
  globalThis.fetch = async (_url, options) => Response.json({ token: options.headers.get('Authorization') });
  assert.deepEqual(await apiRequest('/private'), { token: 'Bearer token' });
});

test('convierte los errores de validación del backend en errores por campo', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Revisa los campos', errors: [{ field: 'email', message: 'Correo no válido' }] }, { status: 400 });
  await assert.rejects(apiRequest('/register', {}, false), error => error.fields.email === 'Correo no válido');
});

test('una respuesta antigua no cierra la sesión de la cuenta siguiente', async () => {
  let finish;
  let expired = false;
  setApiSession('old-token');
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const previous = apiRequest('/private');
  setApiSession('new-token', () => { expired = true; });
  finish(Response.json({ detail: 'Caducado' }, { status: 401 }));
  await assert.rejects(previous);
  assert.equal(expired, false);
});

test('descarta también los datos de una petición antigua que termina con éxito', async () => {
  let finish;
  setApiSession('old-token');
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const previous = apiRequest('/api/auth/me');
  setApiSession('new-token');
  finish(Response.json({ id: 'cuenta anterior' }));
  await assert.rejects(previous, error => error.status === 0 && /sesión ha cambiado/.test(error.message));
});

test('login y registro usan su contrato público y conservan la contraseña', async () => {
  const calls = [];
  const user = { id: 'id', name: 'Ana', email: 'ana@example.com', role: 'CITIZEN' };
  const session = { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, user };
  setApiSession('otra-sesion');
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null, headers: options.headers });
    return Response.json(url.endsWith('/register') ? user : session);
  };
  assert.deepEqual(await authService.signIn(' ana@example.com ', ' password '), session);
  assert.deepEqual(await authService.signUp({ name: ' Ana ', email: ' ana@example.com ', password: ' password ' }), user);
  assert.deepEqual(calls[0].body, { email: 'ana@example.com', password: ' password ' });
  assert.deepEqual(calls[1].body, { name: 'Ana', email: 'ana@example.com', password: ' password ' });
  assert.ok(calls.every(call => !call.headers.has('Authorization')));
  await apiRequest('/public', { headers: { Authorization: 'Bearer accidental' } }, false);
  assert.equal(calls[2].headers.has('Authorization'), false);
});

test('credenciales incorrectas y correo duplicado conservan sus mensajes', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Credenciales inválidas' }, { status: 401 });
  await assert.rejects(authService.signIn('ana@example.com', 'incorrecta'), error => error.status === 401 && error.message === 'Credenciales inválidas');
  globalThis.fetch = async () => Response.json({ detail: 'El email ya está registrado.' }, { status: 409 });
  await assert.rejects(authService.signUp({ name: 'Ana', email: 'ana@example.com', password: 'password' }), error => error.status === 409 && /registrado/.test(error.message));
});

test('recupera y borra la credencial de la pestaña sin almacenar contraseñas', async () => {
  const data = new Map();
  globalThis.window = { sessionStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  } };
  assert.equal(await webStorage.getSession(), null);
  const saved = { accessToken: 'jwt', expiresAt: Date.now() + 900000 };
  await webStorage.saveSession(JSON.stringify(saved));
  assert.deepEqual(readStoredSession(await webStorage.getSession()), saved);
  await webStorage.removeSession();
  assert.equal(await webStorage.getSession(), null);
});

test('propaga los fallos de almacenamiento para permitir reintentar', async () => {
  globalThis.window = { get sessionStorage() { throw new Error('almacenamiento bloqueado'); } };
  await assert.rejects(webStorage.getSession());
  await assert.rejects(webStorage.saveSession('sesion'));
  await assert.rejects(webStorage.removeSession());
});

test('un guardado antiguo termina antes del logout y nunca borra la cuenta nueva', async () => {
  let release;
  let value;
  let version = 1;
  const write = createSessionWriter(async next => {
    if (next === 'anterior') await new Promise(resolve => { release = resolve; });
    value = next;
  });
  const first = write('anterior', () => version === 1);
  await Promise.resolve();
  version = 2;
  const logout = write(null, () => version === 2);
  version = 3;
  const latest = write('nueva', () => version === 3);
  release();
  await Promise.all([first, logout, latest]);
  assert.equal(value, 'nueva');
  await write(null, () => version === 3);
  assert.equal(value, null);
});

test('una escritura fallida no bloquea un nuevo intento de logout', async () => {
  let attempts = 0;
  let value = 'token';
  const write = createSessionWriter(async next => {
    if (++attempts === 1) throw new Error('dispositivo bloqueado');
    value = next;
  });
  await assert.rejects(write(null, () => true));
  await write(null, () => true);
  assert.equal(value, null);
});

test('otro intento de login limpia un guardado anterior aunque sus credenciales fallen', async () => {
  let release;
  let value = null;
  let version = 1;
  const write = createSessionWriter(async next => {
    if (next === 'sesion anterior') await new Promise(resolve => { release = resolve; });
    value = next;
  });
  const oldSave = write('sesion anterior', () => version === 1);
  await Promise.resolve();
  version = 2;
  const prepareLogin = write(null, () => version === 2);
  release();
  await Promise.all([oldSave, prepareLogin]);
  globalThis.fetch = async () => Response.json({ message: 'Credenciales inválidas' }, { status: 401 });
  await assert.rejects(authService.signIn('otra@example.com', 'incorrecta'));
  assert.equal(value, null);
});


test('el formulario de incidencias usa Bearer y no envía un usuario de prueba', async () => {
  const { createIncident } = await import('../src/pages/report/services/report-service.ts');
  const incident = { title: 'Farola', description: 'Apagada', category: 'STREET_LIGHTING', latitude: 40.4, longitude: -3.7 };
  setApiSession('token-ciudadano');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/incidents/create'));
    assert.equal(options.headers.get('Authorization'), 'Bearer token-ciudadano');
    assert.deepEqual(JSON.parse(options.body), incident);
    return Response.json({ id: 'incidencia' }, { status: 201 });
  };
  assert.deepEqual(await createIncident(incident), { id: 'incidencia' });
});

test('el listado usa el cliente común y envía el token', async () => {
  const { getIncidents } = await import('../src/pages/report/services/report-service.ts');
  const incidents = [{ id: '1', title: 'Farola', latitude: 40.4, longitude: -3.7 }];
  setApiSession('token-ciudadano');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/api/incidents/public'));
    assert.equal(options.headers.get('Authorization'), 'Bearer token-ciudadano');
    return Response.json(incidents);
  };
  assert.deepEqual(await getIncidents(), incidents);
});

test('el listado cancela la petición cuando la pantalla deja de estar activa', async () => {
  const { getIncidents } = await import('../src/pages/report/services/report-service.ts');
  const caller = new AbortController();
  let requestSignal;
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new Error('abortada')), { once: true });
  });
  const request = getIncidents(caller.signal);
  caller.abort();
  assert.equal(requestSignal.aborted, true);
  await assert.rejects(request, error => error instanceof ApiError && error.status === 0);
});
