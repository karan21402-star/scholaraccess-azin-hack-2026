import type { SearchResponse } from "./scholarships";

export async function searchScholarships(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(`/api/scholarships/search?q=${encodeURIComponent(query)}`, { signal });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
      ? data.error
      : "Search failed. Please try again.";
    throw new Error(message);
  }
  return data as SearchResponse;
}
