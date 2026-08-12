export function checkIsRecent(lead: { updated_at?: string | null }) {
  const dateStr = lead.updated_at;
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return false;
  return match[1] >= "2026-08-12";
}

export function getEffectiveOutreachStatus(lead: {
  updated_at?: string | null;
  outreach_status?: string | null;
  latestLog?: { status?: string | null } | null;
}) {
  if (checkIsRecent(lead)) {
    return lead.latestLog?.status || lead.outreach_status;
  }
  return lead.outreach_status;
}
