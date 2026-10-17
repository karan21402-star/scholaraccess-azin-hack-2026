import { Router } from "express";
import { z } from "zod";

const router = Router();
const requestSchema = z.object({
  query: z.string().trim().min(2).max(160)
});

export interface ScholarshipResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResults(data: unknown): ScholarshipResult[] {
  if (!isRecord(data) || !Array.isArray(data.results)) return [];

  return data.results.flatMap((item): ScholarshipResult[] => {
    if (!isRecord(item)) return [];
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const snippet = typeof item.snippet === "string" ? item.snippet.trim() : "";
    const url = typeof item.url === "string" ? item.url : "";
    if (!title || !snippet || !/^https?:\/\//i.test(url)) return [];
    let source = "Web result";
    try {
      source = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return [];
    }
    return [{ title, snippet, url, source }];
  });
}

router.get("/scholarships/search", async (request, response) => {
  const parsed = requestSchema.safeParse({ query: request.query.q });
  if (!parsed.success) {
    response.status(400).json({ error: "Enter a search of 2–160 characters." });
    return;
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    response.json({
      mode: "demo",
      results: [],
      message: "Live search is not connected. Add TINYFISH_API_KEY to the server environment to search the web."
    });
    return;
  }

  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", parsed.data.query);
  url.searchParams.set("purpose", "Find trustworthy, current scholarship opportunities and eligibility information in India.");
  url.searchParams.set("location", "India");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const upstream = await fetch(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: controller.signal
    });
    if (!upstream.ok) {
      console.error(`TinyFish search returned HTTP ${upstream.status}`);
      response.status(502).json({ error: "Live scholarship search is temporarily unavailable. Please try again later." });
      return;
    }
    const data: unknown = await upstream.json();
    const results = parseResults(data);
    response.json({
      mode: "tinyfish",
      results,
      message: results.length ? undefined : "TinyFish returned no usable results. Try a broader search."
    });
  } catch (error) {
    console.error("TinyFish search failed:", error);
    response.status(502).json({ error: "Could not reach live search. Check your connection and try again." });
  } finally {
    clearTimeout(timeout);
  }
});

export { router as searchRouter, parseResults };
