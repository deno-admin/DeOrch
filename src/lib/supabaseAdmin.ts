import { createClient } from '@supabase/supabase-js';

// Server-only admin clients — import only from Route Handlers, never from "use client" files.

export function getDeOrchAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export function getLeadsAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_LEADS_SUPABASE_URL || '',
    process.env.LEADS_SUPABASE_SERVICE_ROLE_KEY || ''
  );
}
