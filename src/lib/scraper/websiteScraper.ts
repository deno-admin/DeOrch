export interface ScrapedWebsiteData {
  url: string;
  pagesScraped: string[];
  homepageContent: string;
  subpagesContent: string;
  combinedCleanText: string;
  scrapedAt: string;
}

function cleanHtmlToText(html: string): string {
  if (!html) return "";
  let text = html;

  // Remove scripts, styles, svg, iframe, header, footer
  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
  text = text.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, "");
  text = text.replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, "");
  text = text.replace(/<!--([\s\S]*?)-->/g, "");

  // Extract body if present
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    text = bodyMatch[1];
  }

  // Strip tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Normalize whitespace
  return text.replace(/\s+/g, " ").trim();
}

async function fetchPageText(targetUrl: string, timeoutMs = 5000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return "";
    const html = await response.text();
    return cleanHtmlToText(html).substring(0, 4000);
  } catch (err) {
    console.warn(`Failed to fetch page text for ${targetUrl}:`, err);
    return "";
  }
}

export async function scrapeWebsiteDetailed(rawUrl: string): Promise<ScrapedWebsiteData> {
  if (!rawUrl || rawUrl === "N/A" || rawUrl.trim() === "") {
    return {
      url: "",
      pagesScraped: [],
      homepageContent: "",
      subpagesContent: "",
      combinedCleanText: "",
      scrapedAt: new Date().toISOString(),
    };
  }

  const formattedUrl = rawUrl.startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const origin = new URL(formattedUrl).origin;

  const pagesScraped: string[] = [];

  // Step 1: Scrape Homepage
  const homepageText = await fetchPageText(formattedUrl, 6000);
  if (homepageText) {
    pagesScraped.push(formattedUrl);
  }

  // Step 2: Attempt candidate subpages (/about, /services, /pricing, /products)
  const candidatePaths = ["/about", "/services", "/pricing", "/products"];
  let subpagesTextAcc = "";

  for (const path of candidatePaths) {
    const subUrl = `${origin}${path}`;
    if (subUrl !== formattedUrl) {
      const pageText = await fetchPageText(subUrl, 4000);
      if (pageText && pageText.length > 100) {
        pagesScraped.push(subUrl);
        subpagesTextAcc += `\n--- Page: ${path} ---\n` + pageText;
        if (subpagesTextAcc.length > 5000) break; // Limit subpages accumulation
      }
    }
  }

  const combinedCleanText = (
    `--- Homepage (${formattedUrl}) ---\n` +
    homepageText +
    (subpagesTextAcc ? `\n\n${subpagesTextAcc}` : "")
  ).substring(0, 10000);

  return {
    url: formattedUrl,
    pagesScraped,
    homepageContent: homepageText,
    subpagesContent: subpagesTextAcc.trim(),
    combinedCleanText,
    scrapedAt: new Date().toISOString(),
  };
}
