// public/js/supabase-client.js
//
// One centralized Supabase client for the whole frontend. Every
// page that needs auth includes this file plus the Supabase CDN
// script (see below), then calls getSupabaseClient().
//
// Why fetch the config instead of hardcoding it? The publishable
// key is safe to expose either way — this just means the URL/key
// live in one place (.env on the server) instead of being copy-
// pasted into every HTML file.

let _clientPromise = null;

function getSupabaseClient() {
  if (_clientPromise) return _clientPromise;

  _clientPromise = fetch('/api/config')
    .then((res) => res.json())
    .then(({ supabaseUrl, supabasePublishableKey }) => {
      if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error('Supabase is not configured on the server yet.');
      }
      return window.supabase.createClient(supabaseUrl, supabasePublishableKey);
    });

  return _clientPromise;
}

// Small helper used by protected pages (dashboard, scans, etc.)
// Redirects to /login.html if there's no active session.
async function requireAuthOrRedirect() {
  const client = await getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  return { client, session };
}
