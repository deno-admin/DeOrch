export interface ScrapedPageEvidence {
  url: string;
  title: string;
  headings: string[];
  cleanText: string;
  scrapedAt: string;
  observedClaims: string[];
}

export interface ScrapedWebsiteData {
  url: string;
  pagesScraped: string[];
  homepageContent: string;
  subpagesContent: string;
  combinedCleanText: string;
  pageEvidences: ScrapedPageEvidence[];
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

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = cleanHtmlToText(match[1]);
    if (text && text.length > 3 && text.length < 120) {
      headings.push(text);
    }
  }
  return headings.slice(0, 8);
}

function extractTitle(html: string, fallbackUrl: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const cleanTitle = cleanHtmlToText(titleMatch[1]);
    if (cleanTitle) return cleanTitle;
  }
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    const cleanH1 = cleanHtmlToText(h1Match[1]);
    if (cleanH1) return cleanH1;
  }
  return fallbackUrl;
}

async function fetchPageDetails(targetUrl: string, timeoutMs = 5000): Promise<{ html: string; cleanText: string; title: string; headings: string[] } | null> {
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

    if (!response.ok) return null;
    const html = await response.text();
    const cleanText = cleanHtmlToText(html).substring(0, 3000);
    const title = extractTitle(html, targetUrl);
    const headings = extractHeadings(html);

    return { html, cleanText, title, headings };
  } catch (err) {
    console.warn(`Failed to fetch page text for ${targetUrl}:`, err);
    return null;
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
      pageEvidences: [],
      scrapedAt: new Date().toISOString(),
    };
  }

  const formattedUrl = rawUrl.startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  let origin = formattedUrl;
  try {
    origin = new URL(formattedUrl).origin;
  } catch (e) {
    origin = formattedUrl;
  }

  const pagesScraped: string[] = [];
  const pageEvidences: ScrapedPageEvidence[] = [];

  // Step 1: Scrape Homepage
  const hpDetails = await fetchPageDetails(formattedUrl, 6000);
  let homepageText = "";

  if (hpDetails && hpDetails.cleanText) {
    homepageText = hpDetails.cleanText;
    pagesScraped.push(formattedUrl);
    
    // Extract short sentence snippets as observed claims
    const sentences = hpDetails.cleanText.split(/[.!?]+\s+/).filter(s => s.length > 20 && s.length < 180).slice(0, 6);

    pageEvidences.push({
      url: formattedUrl,
      title: hpDetails.title,
      headings: hpDetails.headings,
      cleanText: hpDetails.cleanText,
      scrapedAt: new Date().toISOString(),
      observedClaims: sentences,
    });
  }

  // Step 2: Candidate subpages (/about, /services, /pricing, /products)
  const candidatePaths = ["/about", "/services", "/pricing", "/products"];
  let subpagesTextAcc = "";

  for (const path of candidatePaths) {
    const subUrl = `${origin}${path}`;
    if (subUrl !== formattedUrl && !pagesScraped.includes(subUrl)) {
      const pageDetails = await fetchPageDetails(subUrl, 4000);
      if (pageDetails && pageDetails.cleanText.length > 100) {
        pagesScraped.push(subUrl);
        subpagesTextAcc += `\n--- Page: ${path} ---\n` + pageDetails.cleanText;
        
        const sentences = pageDetails.cleanText.split(/[.!?]+\s+/).filter(s => s.length > 20 && s.length < 180).slice(0, 4);

        pageEvidences.push({
          url: subUrl,
          title: pageDetails.title,
          headings: pageDetails.headings,
          cleanText: pageDetails.cleanText,
          scrapedAt: new Date().toISOString(),
          observedClaims: sentences,
        });

        if (subpagesTextAcc.length > 4000) break;
      }
    }
  }

  const combinedCleanText = (
    `--- Homepage (${formattedUrl}) ---\n` +
    homepageText +
    (subpagesTextAcc ? `\n\n${subpagesTextAcc}` : "")
  ).substring(0, 8000);

  return {
    url: formattedUrl,
    pagesScraped,
    homepageContent: homepageText,
    subpagesContent: subpagesTextAcc.trim(),
    combinedCleanText,
    pageEvidences,
    scrapedAt: new Date().toISOString(),
  };
}
