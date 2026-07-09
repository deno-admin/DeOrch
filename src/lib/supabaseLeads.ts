import { createClient } from '@supabase/supabase-js';

const leadsSupabaseUrl = process.env.NEXT_PUBLIC_LEADS_SUPABASE_URL || '';
const leadsSupabaseAnonKey = process.env.NEXT_PUBLIC_LEADS_SUPABASE_ANON_KEY || '';

// Client for the lead-sourcing-pipeline project's clay_outreach_leads table
export const supabaseLeads = createClient(leadsSupabaseUrl, leadsSupabaseAnonKey);
