export interface ParsedCandidate {
  id: string;
  name: string;
  role: string;
  company: string;
  headline: string;
  location?: string;
  formattedTarget: string;
}

/**
 * Intelligently extracts individual candidate fields (Name, Role, Company) from a single target input string.
 * Examples:
 *  - "Karan Mukkarji, UI/UX Designer at Xtech Code" -> { name: "Karan Mukkarji", role: "UI/UX Designer", company: "Xtech Code" }
 *  - "Karan Mukkarji - Founder & Product Lead @ Asymmetric Labs" -> { name: "Karan Mukkarji", role: "Founder & Product Lead", company: "Asymmetric Labs" }
 *  - "Careers Team at Predigle" -> { name: "Careers Team", role: "UI/UX Designer", company: "Predigle" }
 *  - "Nikunj at Asymmetric Labs" -> { name: "Nikunj", role: "UI/UX Designer", company: "Asymmetric Labs" }
 */
export function parseSingleTargetInput(input: string): { name: string; role: string; company: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { name: "Hiring Manager", role: "UI/UX Designer", company: "your team" };
  }

  let name = "";
  let role = "";
  let company = "";

  // Check if input contains '@' or 'at'
  const atParts = trimmed.split(/\s+@\s+|\s+at\s+/i);
  if (atParts.length >= 2) {
    company = atParts[atParts.length - 1].split(/,|\n|-/)[0].trim();
    const leftSide = atParts.slice(0, atParts.length - 1).join(" at ");
    
    if (leftSide.includes(",")) {
      const parts = leftSide.split(",");
      name = parts[0].trim();
      role = parts.slice(1).join(",").trim();
    } else if (leftSide.includes(" - ")) {
      const parts = leftSide.split(" - ");
      name = parts[0].trim();
      role = parts.slice(1).join(" - ").trim();
    } else {
      name = leftSide.trim();
    }
  } else if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    name = parts[0].trim();
    const rest = parts.slice(1).join(",").trim();
    if (rest.toLowerCase().includes("at")) {
      const subParts = rest.split(/\s+at\s+/i);
      role = subParts[0].trim();
      company = subParts[1].trim();
    } else {
      role = rest;
    }
  } else if (trimmed.includes(" - ")) {
    const parts = trimmed.split(" - ");
    name = parts[0].trim();
    company = parts[1].trim();
  } else {
    name = trimmed;
  }

  // Clean up clean names if degree or degree indicators present (e.g. "Karan Mukkarji · 1st")
  name = name.replace(/·\s*\d+(st|nd|rd|th)?/g, "").replace(/\(.*\)/g, "").trim();
  company = company.replace(/·\s*\d+(st|nd|rd|th)?/g, "").trim();

  // Fallbacks if empty
  if (!name) name = "Hiring Manager";
  if (!role) role = "UI/UX Designer";
  if (!company) company = "your team";

  return { name, role, company };
}

/**
 * Parses raw text copied from LinkedIn search results or screen listings into up to 10 structured candidate records.
 */
export function parseCandidatesFromText(rawText: string): ParsedCandidate[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const candidates: ParsedCandidate[] = [];
  
  // Strategy 1: Look for lines containing connection indicators (e.g. "· 1st", "· 2nd", "· 3rd+") or standard LinkedIn profile blocks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";
    const nextNextLine = lines[i + 2] || "";

    const isNameLine =
      line.includes("· 1st") ||
      line.includes("· 2nd") ||
      line.includes("· 3rd") ||
      /^[A-Z][a-z]+(\s+[A-Z][a-z\.]+){1,3}(\s*·\s*(1st|2nd|3rd\+?))?$/.test(line);

    if (isNameLine) {
      const cleanName = line.replace(/·\s*\d+(st|nd|rd|th|\+)?/gi, "").trim();
      const headline = nextLine && !nextLine.startsWith("Current:") && !nextLine.startsWith("Location") ? nextLine : "";
      
      let company = "";
      let role = "";

      // Try to extract company & role from headline or current work line
      const currentWorkLine = [nextLine, nextNextLine].find((l) => l.startsWith("Current:") || l.includes(" at "));
      if (currentWorkLine) {
        const parsed = parseSingleTargetInput(currentWorkLine.replace(/^Current:\s*/i, ""));
        company = parsed.company;
        role = parsed.role;
      }

      if (!role && headline) {
        const parsed = parseSingleTargetInput(headline);
        role = parsed.role || "UI/UX Designer";
        if (!company) company = parsed.company;
      }

      candidates.push({
        id: `cand-${candidates.length + 1}-${Date.now()}`,
        name: cleanName,
        role: role || "UI/UX Designer",
        company: company || "their team",
        headline: headline || `${cleanName} - UI/UX Designer`,
        formattedTarget: `${cleanName}, ${role || "UI/UX Designer"} at ${company || "their team"}`,
      });

      if (candidates.length >= 10) break; // Limit to 10 candidates per page
    }
  }

  // Strategy 2: Fallback line-by-line block parsing if strategy 1 yielded no results
  if (candidates.length === 0) {
    const blocks = rawText.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    for (const block of blocks) {
      const blockLines = block.split(/\n/).map((s) => s.trim()).filter(Boolean);
      if (blockLines.length > 0) {
        const nameLine = blockLines[0];
        // Skip common UI header lines
        if (
          nameLine.toLowerCase().includes("search") ||
          nameLine.toLowerCase().includes("people") ||
          nameLine.toLowerCase().includes("showing")
        ) {
          continue;
        }

        const parsed = parseSingleTargetInput(block);
        candidates.push({
          id: `cand-${candidates.length + 1}-${Date.now()}`,
          name: parsed.name,
          role: parsed.role,
          company: parsed.company,
          headline: blockLines[1] || blockLines[0],
          formattedTarget: `${parsed.name}, ${parsed.role} at ${parsed.company}`,
        });

        if (candidates.length >= 10) break;
      }
    }
  }

  return candidates;
}
