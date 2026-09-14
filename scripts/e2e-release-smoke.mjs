#!/usr/bin/env node
const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
if (!base) {
  console.error('APP_BASE_URL is required, e.g. https://your-app.vercel.app')
  process.exit(2)
}

const checks = []
async function checkPath(path) {
  const started = Date.now()
  const response = await fetch(`${base}${path}`, { redirect: 'manual' })
  checks.push({ name: `GET ${path}`, status: response.status, ms: Date.now() - started })
  if (response.status >= 500) throw new Error(`${path} returned HTTP ${response.status}`)
}

for (const path of ['/', '/login', '/signup', '/register', '/verify/PTI-SMOKE-INVALID']) {
  await checkPath(path)
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anon = process.env.VITE_SUPABASE_ANON_KEY || ''
if (supabaseUrl && anon) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  checks.push({ name: 'Supabase REST reachability', status: response.status, ms: 0 })
  if (response.status >= 500) throw new Error(`Supabase REST returned HTTP ${response.status}`)

  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (email && password) {
    const auth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!auth.ok) throw new Error(`E2E login failed: HTTP ${auth.status}`)
    const token = (await auth.json()).access_token
    for (const rpc of ['my_notification_unread_count', 'my_finance_workbench_access', 'my_leadership_access']) {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpc}`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: '{}',
      })
      checks.push({ name: `RPC ${rpc}`, status: r.status, ms: 0 })
      if (!r.ok) throw new Error(`${rpc} failed: HTTP ${r.status}: ${await r.text()}`)
    }
  } else {
    console.log('Authenticated E2E RPC checks skipped (set E2E_EMAIL and E2E_PASSWORD).')
  }
} else {
  console.log('Supabase reachability checks skipped (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).')
}

console.table(checks)
console.log('Release E2E smoke: PASS')
