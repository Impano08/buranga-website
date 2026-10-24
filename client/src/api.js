const BASE = '';

async function request(path, { method = 'GET', body, formData } = {}) {
  const options = { method, credentials: 'include', headers: {} };
  if (formData) {
    options.body = formData;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => request(path, { method: 'POST', formData }),
  putForm: (path, formData) => request(path, { method: 'PUT', formData }),
};

export function imageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url;
}

export function initialsAvatar(name = '?') {
  return `https://ui-avatars.com/api/?background=A67C52&color=fff&bold=true&name=${encodeURIComponent(name)}`;
}
