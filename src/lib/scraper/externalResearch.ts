export interface ExternalResearchItem {
  query: string;
  source_url: string;
  source_title: string;
  source_type: "external_web" | "news" | "industry_pub";
  passage: string;
  retrieved_at: string;
}

export interface ExternalResearchResult {
  queriesRun: string[];
  items: ExternalResearchItem[];
  hasExternalData: boolean;
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchTargetedExternalResearch(
  company: string,
  domain?: string,
  role?: string
): Promise<ExternalResearchResult> {
  if (!company || company === "N/A" || company.trim() === "") {
    return { queriesRun: [], items: [], hasExternalData: false };
  }

  const cleanCompany = company.trim();
  const queries = [
    `${cleanCompany} latest news announcements`,
    `${cleanCompany} product launch expansion`,
  ];

  const items: ExternalResearchItem[] = [];

  for (const query of queries) {
    try {
      // Use DuckDuckGo HTML search endpoint for zero-auth public search passages
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        
        // Extract result snippets from DuckDuckGo HTML structure
        const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let count = 0;

        while ((match = resultRegex.exec(html)) !== null && count < 2) {
          let rawLink = match[1];
          // Unwrap DuckDuckGo redirect link format if needed
          if (rawLink.includes("uddg=")) {
            const matchLink = rawLink.match(/uddg=([^&]+)/);
            if (matchLink && matchLink[1]) {
              rawLink = decodeURIComponent(matchLink[1]);
            }
          }

          const snippet = cleanText(match[2]);
          if (snippet && snippet.length > 25 && !rawLink.includes("duckduckgo.com")) {
            let sType: "external_web" | "news" | "industry_pub" = "external_web";
            if (rawLink.includes("news") || rawLink.includes("reuters") || rawLink.includes("bloomberg") || rawLink.includes("techcrunch") || rawLink.includes(" Forbes")) {
              sType = "news";
            }

            let sourceTitle = `${cleanCompany} Search Result`;
            try {
              sourceTitle = new URL(rawLink).hostname.replace("www.", "");
            } catch (e) {}

            items.push({
              query,
              source_url: rawLink,
              source_title: sourceTitle,
              source_type: sType,
              passage: snippet,
              retrieved_at: new Date().toISOString(),
            });
            count++;
          }
        }
      }
    } catch (err) {
      console.warn(`External research query failed for "${query}":`, err);
    }
  }

  return {
    queriesRun: queries,
    items,
    hasExternalData: items.length > 0,
  };
}
