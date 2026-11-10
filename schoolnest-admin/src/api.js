export const DEFAULT_BASE_URL = 'https://grayva-sms-production.onrender.com/api/v1'

// One function all API calls go through — attaches Bearer token and
// X-Tenant-Subdomain automatically, and unwraps the {success, message, data}
// envelope your backend always returns, throwing a readable Error on failure.
export async function apiFetch(baseUrl, path, { method = 'GET', body, token, subdomain, isFormData = false } = {}) {
  const headers = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (subdomain) headers['X-Tenant-Subdomain'] = subdomain

  let res
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })
  } catch {
    throw new Error('Could not reach the server. Check the API base URL and your connection.')
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`)
  }
  return payload?.data
}