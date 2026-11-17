import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/server/logic/config";
import { buildIndex, tokenize } from "@/server/rag/bm25";
import { knowledgeDocs } from "@/server/rag/knowledge";
import type { RagDoc } from "@/server/rag/types";

const offer = (id: string, title: string, area: string, text: string): RagDoc => ({ id, kind: "offer", label: `Live post: ${title} · ${area}`, keywords: `${title} ${area}`, text });

function rank(query: string, extra: RagDoc[] = []) {
  const docs = [...knowledgeDocs(DEFAULT_CONFIG), ...extra];
  const index = buildIndex(docs, (d) => d.text, (d) => `${d.label} ${d.keywords ?? ""}`);
  return index.search(query, 5).map((h) => h.doc.id);
}

describe("rag retrieval", () => {
  it("tokenizes with stopwords removed and light stemming", () => {
    expect(tokenize("How do I donate the meals?")).toEqual(["donate", "meal"]);
  });

  it("finds website knowledge for how-to questions", () => {
    expect(rank("how do I donate surplus food")[0]).toBe("post-food");
    expect(rank("how does the OTP code work at pickup")[0]).toBe("handover-otp");
    expect(rank("is it free, any fee?")[0]).toBe("free");
    expect(rank("how long is cooked food safe")[0]).toBe("safety-hours");
    expect(rank("who can see my address")[0]).toBe("address-privacy");
  });

  it("uses config numbers in the knowledge text", () => {
    const hold = knowledgeDocs({ ...DEFAULT_CONFIG, holdMinutes: 42 }).find((d) => d.id === "request-food")!;
    expect(hold.text).toContain("42 minutes");
  });

  it("finds live database posts by name and area", () => {
    const live = [
      offer("o1", "Chicken biryani trays", "Beach Road", "Live food post Chicken biryani trays in Beach Road. 35 meals, non-vegetarian."),
      offer("o2", "Fresh bread and buns", "Medical College", "Live food post Fresh bread and buns in Medical College. 60 meals, vegetarian."),
    ];
    expect(rank("is there any biryani available", live)[0]).toBe("o1");
    expect(rank("food near medical college", live)[0]).toBe("o2");
  });

  it("returns nothing for gibberish", () => {
    expect(rank("zzzqqq xyzzy")).toEqual([]);
  });
});
