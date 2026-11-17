
export const DEFAULT_BASE_URL = 'https://grayva-sms-staging.onrender.com/api/v1'

// One function all API calls go through.
export async function apiFetch(
  baseUrl,
  path,
  {
    method = 'GET',
    body,
    token,
    subdomain,
    isFormData = false,
  } = {}
) {
  const headers = {}

  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (subdomain) headers['X-Tenant-Subdomain'] = subdomain

  let res

  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body
        ? isFormData
          ? body
          : JSON.stringify(body)
        : undefined,
    })
  } catch {
    const error = new Error(
      'Could not reach the server. Check the API base URL and your connection.'
    )
    error.status = 0
    throw error
  }

  const isJson = res.headers
    .get('content-type')
    ?.includes('application/json')

  const payload = isJson
    ? await res.json().catch(() => null)
    : null

  if (!res.ok) {
    const error = new Error(
      payload?.message || `Request failed (${res.status})`
    )

    error.status = res.status
    error.statusCode = res.status
    error.data = payload?.data
    error.code = payload?.code

    throw error
  }

  return payload?.data
}
