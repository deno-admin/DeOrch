import { createClient } from '@supabase/supabase-js';

const leadsSupabaseUrl = process.env.NEXT_PUBLIC_LEADS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const leadsSupabaseAnonKey = process.env.NEXT_PUBLIC_LEADS_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client for the deorch_leads table in DeOrch Supabase project
export const supabaseLeads = createClient(leadsSupabaseUrl, leadsSupabaseAnonKey);
