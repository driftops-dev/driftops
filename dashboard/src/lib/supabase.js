import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

/**
 * Fetch dashboard stats from Cloudflare Worker
 */
export async function fetchDashboard(token) {
  const res = await fetch(`${workerUrl}/api/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}

/**
 * Fetch scan history for a repo
 */
export async function fetchScans(token, repo) {
  const url = repo
    ? `${workerUrl}/api/scans?repo=${encodeURIComponent(repo)}`
    : `${workerUrl}/api/scans`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to fetch scans')
  return res.json()
}
