import { SIT_WEBSITE_URL } from "../data/sit-knowledge.js";

const SIT_SITE_PAGES = [
  {
    path: "/",
    title: "Stanford Institute of Technology — Overview",
    category: "About",
  },
  { path: "/about-us", title: "Why Choose SIT", category: "About" },
  { path: "/courses", title: "Courses", category: "Courses" },
  {
    path: "/contact-us",
    title: "Contact & Campus Locations",
    category: "Contact",
  },
  {
    path: "/inquiry-now",
    title: "How to Apply at SIT",
    category: "Admissions",
  },
];

function extractTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractTextFromHTML(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?/gi, "\n")
    .replace(
      /<\/\s*(?:p|div|section|article|header|footer|nav|aside|h[1-6]|li|ul|ol|table|tr|td|th|blockquote)[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\r]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();

  return text;
}

async function fetchPageText(url) {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("Fetch API is not available in this Node runtime.");
  }

  const response = await globalThis.fetch(url, {
    headers: { "User-Agent": "sit-assistant/1.0" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
}

export async function fetchSitWebsiteEntries() {
  const entries = [];

  for (const page of SIT_SITE_PAGES) {
    const url = `${SIT_WEBSITE_URL}${page.path}`;
    try {
      const html = await fetchPageText(url);
      const pageTitle = extractTitle(html) || page.title;
      const content = extractTextFromHTML(html);

      if (!content) {
        console.warn(`Empty content from ${url}, skipping.`);
        continue;
      }

      entries.push({
        title: pageTitle,
        category: page.category,
        url,
        content,
      });
    } catch (error) {
      console.warn(`Live SIT page fetch failed for ${url}:`, error.message);
    }
  }

  if (entries.length === 0) {
    throw new Error("No live SIT website content could be fetched.");
  }

  return entries;
}
