import { describe, it, expect } from "vitest";
import { detectLanguage } from "@/lib/construction-dictionary/language-detection";

describe("detectLanguage", () => {
  it("defaults to English for plain latin text", () => {
    expect(detectLanguage("how many bags of cement do I need")).toBe("en");
  });
  it("returns the default for empty input", () => {
    expect(detectLanguage("   ")).toBe("en");
  });
  it("detects unambiguous scripts", () => {
    expect(detectLanguage("كم كيس أسمنت أحتاج")).toBe("ar");
    expect(detectLanguage("我需要多少袋水泥")).toBe("zh");
    expect(detectLanguage("मुझे कितने बैग चाहिए")).toBe("hi");
  });
  it("detects Nigerian Pidgin from two or more markers", () => {
    expect(detectLanguage("abeg how much be cement")).toBe("pcm");
    expect(detectLanguage("wetin be the price, abeg")).toBe("pcm");
  });
  it("detects latin vocabulary languages from two or more markers", () => {
    expect(detectLanguage("combien de peinture ai-je besoin")).toBe("fr");
    expect(detectLanguage("quanto cimento preciso para o telhado")).toBe("pt");
  });
});
