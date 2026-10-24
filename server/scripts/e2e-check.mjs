/* Quick end-to-end API test used during development verification. */
const BASE = 'http://localhost:5175';
let cookie = '';

async function req(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
    redirect: 'manual',
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  setCookie.forEach((c) => {
    const pair = c.split(';')[0];
    if (pair.startsWith('buranga_token=')) cookie = pair;
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function pngForm() {
  const form = new FormData();
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'test.png');
  form.append('title', 'Node E2E Style');
  form.append('description', 'Uploaded during automated end to end verification.');
  form.append('category', "Women's Haircut");
  form.append('tags', 'e2e, automated');
  return form;
}

async function main() {
  const log = (label, result) => console.log(`${label}: ${result.status} ${JSON.stringify(result.data)?.slice(0, 160)}`);

  // 1. register a fresh user
  const email = `e2e-${Date.now()}@buranga.app`;
  log('register', await req('/api/auth/register', { method: 'POST', body: { name: 'E2E Node', email, password: 'e2e12345', confirmPassword: 'e2e12345' } }));

  // 2. find a post owned by someone else
  const list = await req('/api/hairstyles?limit=5');
  const otherPost = list.data.items.find((i) => i.author?.name !== 'E2E Node');
  console.log('other post id:', otherPost.id, 'owner:', otherPost.author?.name);

  // 3. try editing someone else's post -> expect 403
  log('edit others post (expect 403)', await req(`/api/hairstyles/${otherPost.id}`, { method: 'PUT', body: { title: 'Hacked Title Attempted' } }));

  // 4. try deleting someone else's post -> expect 403
  log('delete others post (expect 403)', await req(`/api/hairstyles/${otherPost.id}`, { method: 'DELETE' }));

  // 5. upload own post
  const up = await req('/api/hairstyles', { method: 'POST', form: pngForm() });
  log('upload', up);
  const myId = up.data.item.id;

  // 6. edit own post -> 200
  log('edit own post', await req(`/api/hairstyles/${myId}`, { method: 'PUT', body: { title: 'Node E2E Style Edited' } }));

  // 7. favorite own post + list favorites
  log('favorite', await req(`/api/favorites/${otherPost.id}`, { method: 'POST' }));
  log('favorites list', await req('/api/favorites'));

  // 8. unfavorite
  log('unfavorite', await req(`/api/favorites/${otherPost.id}`, { method: 'DELETE' }));

  // 9. delete own post -> 200
  log('delete own post', await req(`/api/hairstyles/${myId}`, { method: 'DELETE' }));

  // 10. verify deleted
  log('get deleted (expect 404)', await req(`/api/hairstyles/${myId}`));

  // 11. logout + protected route check
  log('logout', await req('/api/auth/logout', { method: 'POST' }));
  cookie = '';
  log('upload while signed out (expect 401)', await req('/api/hairstyles', { method: 'POST', form: pngForm() }));
}

main().catch((e) => { console.error(e); process.exit(1); });
