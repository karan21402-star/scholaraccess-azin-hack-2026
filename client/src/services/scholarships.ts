export interface Scholarship {
  name: string;
  amount: string;
  category: string;
  deadline: string;
  description: string;
  initials: string;
  color: string;
}

export const featuredScholarships: Scholarship[] = [
  {
    name: "National Means-cum-Merit Scholarship",
    amount: "₹12,000 / year",
    category: "School students",
    deadline: "30 Nov 2026",
    description: "For students continuing from Class IX to XII who meet the scheme's merit and income requirements.",
    initials: "NM",
    color: "mint"
  },
  {
    name: "AICTE Pragati Scholarship",
    amount: "Up to ₹50,000 / year",
    category: "Undergraduate",
    deadline: "Check official notice",
    description: "A scholarship scheme for eligible girl students pursuing a technical diploma or degree.",
    initials: "AP",
    color: "lilac"
  },
  {
    name: "Central Sector Scheme of Scholarships",
    amount: "₹12,000–₹20,000 / year",
    category: "Undergraduate",
    deadline: "Check official notice",
    description: "Merit-based financial support for eligible students pursuing higher education.",
    initials: "CS",
    color: "peach"
  }
];

export interface LiveResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface SearchResponse {
  mode: "tinyfish" | "demo";
  results: LiveResult[];
  message?: string;
}
