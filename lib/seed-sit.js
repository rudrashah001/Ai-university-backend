import { connectToDatabase } from "./db.js";
import { WebsiteData } from "./models/WebsiteData.js";
import { FAQ } from "./models/FAQ.js";
import { generateEmbedding } from "./rag.js";
import { WEBSITE_ENTRIES, FAQ_ENTRIES } from "../data/sit-knowledge.js";
import { fetchSitWebsiteEntries } from "./fetch-sit.js";

export async function seedSitWebsiteIfEmpty({ force = false } = {}) {
  const forceSeed = force || process.env.FORCE_SEED === "1";

  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "GEMINI_API_KEY missing — skipping SIT knowledge seed (RAG will use keyword fallback)",
    );
    return { seeded: false, reason: "no_gemini_key" };
  }

  try {
    await connectToDatabase();

    if (forceSeed) {
      await Promise.all([WebsiteData.deleteMany({}), FAQ.deleteMany({})]);
      console.log("Cleared existing knowledge base for reseed.");
    }

    const [websiteCount, faqCount] = await Promise.all([
      WebsiteData.countDocuments(),
      FAQ.countDocuments(),
    ]);

    if (!forceSeed && websiteCount > 0 && faqCount > 0) {
      console.log(
        `SIT knowledge already loaded (${websiteCount} pages, ${faqCount} FAQs)`,
      );
      return { seeded: false, reason: "already_exists" };
    }

    console.log(
      "Seeding Stanford Institute of Technology knowledge from www.sit.edu.au ...",
    );

    let websiteEntries = WEBSITE_ENTRIES;
    if (!process.env.DISABLE_SIT_LIVE_FETCH) {
      try {
        const liveEntries = await fetchSitWebsiteEntries();
        if (liveEntries.length > 0) {
          websiteEntries = liveEntries;
          console.log(
            `  ✓ fetched ${liveEntries.length} live website entries from ${process.env.SIT_WEBSITE_URL || "www.sit.edu.au"}`,
          );
        }
      } catch (error) {
        console.warn(
          "Live SIT website fetch failed, falling back to bundled content:",
          error.message,
        );
      }
    }

    if (forceSeed || websiteCount === 0) {
      for (const entry of websiteEntries) {
        const text = `${entry.title}\n${entry.content}`;
        const embedding = await generateEmbedding(text);
        await WebsiteData.create({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          url: entry.url,
          embedding,
        });
      }
      console.log(`  ✓ ${websiteEntries.length} website content entries`);
    }

    if (forceSeed || faqCount === 0) {
      for (const faq of FAQ_ENTRIES) {
        const text = `Q: ${faq.question}\nA: ${faq.answer}`;
        const embedding = await generateEmbedding(text);
        await FAQ.create({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order: faq.order,
          isActive: true,
          embedding,
        });
      }
      console.log(`  ✓ ${FAQ_ENTRIES.length} FAQs`);
    }

    console.log("SIT knowledge base ready.");
    return { seeded: true };
  } catch (error) {
    console.error("SIT seed error:", error.message);
    return { seeded: false, reason: "error", error: error.message };
  }
}
