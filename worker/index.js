/**
 * PipelineIQ — Cloudflare Worker
 * Free-tier backend API deployed globally on Cloudflare's edge
 * Handles: snapshot storage, user auth tokens, compliance history
 *
 * Deploy: wrangler deploy
 * Cost: Free (100,000 requests/day on Cloudflare free tier)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for dashboard
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const respond = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    // ── Auth middleware ──────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Skip auth for health check
    if (path === '/health') {
      return respond({ status: 'ok', timestamp: new Date().toISOString() });
    }

    if (!token) {
      return respond({ error: 'Unauthorized — missing token' }, 401);
    }

    // Validate token against Supabase
    const userId = await validateToken(token, env);
    if (!userId && path !== '/api/auth/validate') {
      return respond({ error: 'Unauthorized — invalid token' }, 401);
    }

    // ── Routes ───────────────────────────────────────────────────────────────

    // GET /api/snapshots/latest?repo=owner/repo
    if (path === '/api/snapshots/latest' && request.method === 'GET') {
      const repo = url.searchParams.get('repo');
      if (!repo) return respond({ error: 'repo param required' }, 400);

      const key = `snapshots:${userId}:${repo}:latest`;
      const data = await env.PIPELINEIQ_KV.get(key, 'json');

      if (!data) return respond({ error: 'No prior snapshot found' }, 404);
      return respond(data);
    }

    // POST /api/snapshots — save a new snapshot
    if (path === '/api/snapshots' && request.method === 'POST') {
      const body = await request.json();
      const { repo, sha, snapshot } = body;

      if (!repo || !snapshot) return respond({ error: 'repo and snapshot required' }, 400);

      const timestamp = new Date().toISOString();
      const record = { repo, sha, snapshot, timestamp, userId };

      // Save as latest
      await env.PIPELINEIQ_KV.put(
        `snapshots:${userId}:${repo}:latest`,
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 90 } // 90 days
      );

      // Save to history (keyed by sha)
      await env.PIPELINEIQ_KV.put(
        `snapshots:${userId}:${repo}:${sha}`,
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 30 } // 30 days for history
      );

      return respond({ success: true, timestamp });
    }

    // GET /api/scans?repo=owner/repo — list scan history
    if (path === '/api/scans' && request.method === 'GET') {
      const repo = url.searchParams.get('repo');
      const prefix = repo
        ? `scans:${userId}:${repo}:`
        : `scans:${userId}:`;

      const list = await env.PIPELINEIQ_KV.list({ prefix, limit: 50 });
      const scans = await Promise.all(
        list.keys.map(k => env.PIPELINEIQ_KV.get(k.name, 'json'))
      );

      return respond(scans.filter(Boolean).reverse());
    }

    // POST /api/scans — save a scan result
    if (path === '/api/scans' && request.method === 'POST') {
      const body = await request.json();
      const { repo, sha, score, violations, diff } = body;

      if (!repo) return respond({ error: 'repo required' }, 400);

      const timestamp = new Date().toISOString();
      const record = {
        repo, sha, score, violations_count: violations?.length || 0,
        critical_count: violations?.filter(v => v.severity === 'critical').length || 0,
        drift_detected: diff?.drift_detected || false,
        timestamp, userId
      };

      await env.PIPELINEIQ_KV.put(
        `scans:${userId}:${repo}:${timestamp}`,
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 90 }
      );

      return respond({ success: true });
    }

    // GET /api/dashboard — aggregated stats for the dashboard
    if (path === '/api/dashboard' && request.method === 'GET') {
      const prefix = `scans:${userId}:`;
      const list = await env.PIPELINEIQ_KV.list({ prefix, limit: 100 });
      const scans = (await Promise.all(
        list.keys.map(k => env.PIPELINEIQ_KV.get(k.name, 'json'))
      )).filter(Boolean);

      const repos = [...new Set(scans.map(s => s.repo))];
      const latestByRepo = {};
      for (const repo of repos) {
        const repoScans = scans.filter(s => s.repo === repo).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        latestByRepo[repo] = repoScans[0];
      }

      const avgScore = scans.length
        ? Math.round(scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length)
        : 0;

      return respond({
        total_scans: scans.length,
        repos_monitored: repos.length,
        avg_compliance_score: avgScore,
        latest_by_repo: latestByRepo,
        recent_scans: scans.slice(-10).reverse()
      });
    }

    // POST /api/auth/validate — validate a Supabase JWT
    if (path === '/api/auth/validate' && request.method === 'POST') {
      const valid = !!userId;
      return respond({ valid, userId });
    }

    return respond({ error: 'Not found' }, 404);
  }
};

/**
 * Validate a Supabase JWT token
 * In production this verifies against Supabase's JWKS endpoint
 */
async function validateToken(token, env) {
  try {
    // For POC: validate against Supabase auth API
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Dev mode: accept any non-empty token
      return token ? 'dev-user' : null;
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey
      }
    });

    if (!res.ok) return null;
    const user = await res.json();
    return user.id || null;

  } catch {
    return null;
  }
}
