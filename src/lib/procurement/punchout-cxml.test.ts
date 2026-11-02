import { describe, expect, it } from "vitest";
import {
  buildPunchOutSetupRequest,
  parsePunchOutOrderMessage,
  parsePunchOutSetupResponse,
  type CxmlMerchantConfig,
} from "./punchout-cxml";

const config: CxmlMerchantConfig = {
  merchantName: "Home Depot Pro",
  punchoutUrl: "https://punchout.homedepot.com/setup",
  networkId: "D+0012345",
  fromDomain: "NetworkID",
  fromIdentity: "FRELUX-BUYER",
  toDomain: "DUNS",
  toIdentity: "123456789",
  senderDomain: "NetworkID",
  senderIdentity: "FRELUX-BUYER",
  sharedSecret: "trade-secret-1",
  currency: "USD",
};

describe("buildPunchOutSetupRequest", () => {
  it("builds a valid cXML 1.2 PunchOutSetupRequest with credentials", () => {
    const r = buildPunchOutSetupRequest(config, {
      buyerCookie: "cookie-123",
      browserFormPostUrl: "https://freluxtools.netlify.app/api/punchout/return",
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(r.xml).toContain("<!DOCTYPE cXML SYSTEM \"http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd\">");
    expect(r.xml).toContain("<PunchOutSetupRequest operation=\"create\">");
    expect(r.xml).toContain("<BuyerCookie>cookie-123</BuyerCookie>");
    expect(r.xml).toContain("https://freluxtools.netlify.app/api/punchout/return");
    expect(r.xml).toContain("<SharedSecret>trade-secret-1</SharedSecret>");
    expect(r.xml).toContain("https://punchout.homedepot.com/setup");
  });

  it("escapes XML metacharacters in credentials and URLs", () => {
    const r = buildPunchOutSetupRequest(
      { ...config, sharedSecret: "p&ss<w>ord\"'" },
      { buyerCookie: "c<x>", browserFormPostUrl: "https://x.io/post?a=1&b=2" },
    );
    expect(r.ok).toBe(true);
    expect(r.xml).not.toContain("p&ss");
    expect(r.xml).toContain("p&amp;ss&lt;w&gt;ord&quot;&apos;");
    expect(r.xml).toContain("c&lt;x&gt;");
  });

  it("refuses to build a request with missing credentials", () => {
    const r = buildPunchOutSetupRequest(
      { ...config, sharedSecret: "" },
      { buyerCookie: "c", browserFormPostUrl: "https://x.io" },
    );
    expect(r.ok).toBe(false);
    expect(r.xml).toBeNull();
    expect(r.errors.join(" ")).toContain("shared secret is required");
  });

  it("refuses to build without a buyer cookie or return URL", () => {
    expect(
      buildPunchOutSetupRequest(config, { buyerCookie: "", browserFormPostUrl: "https://x.io" }).ok,
    ).toBe(false);
    expect(
      buildPunchOutSetupRequest(config, { buyerCookie: "c", browserFormPostUrl: "" }).ok,
    ).toBe(false);
  });
});

describe("parsePunchOutSetupResponse", () => {
  const okResponse = `<?xml version="1.0"?>
<cXML><Response><Status code="200" text="OK"/>
<PunchOutSetupResponse><StartPage><URL>https://punchout.homedepot.com/start?sid=42</URL></StartPage></PunchOutSetupResponse>
</Response></cXML>`;

  it("extracts the StartPage URL from a successful response", () => {
    const r = parsePunchOutSetupResponse(okResponse);
    expect(r.ok).toBe(true);
    expect(r.startPageUrl).toBe("https://punchout.homedepot.com/start?sid=42");
  });

  it("refuses a supplier rejection with the cXML status and description", () => {
    const r = parsePunchOutSetupResponse(
      `<cXML><Response><Status code="401" text="Unauthorized"/><Description>SharedSecret mismatch</Description></Response></cXML>`,
    );
    expect(r.ok).toBe(false);
    expect(r.statusCode).toBe("401");
    expect(r.errors.join(" ")).toContain("rejected the punchout session");
    expect(r.errors.join(" ")).toContain("SharedSecret mismatch");
  });

  it("refuses an empty or URL-less response", () => {
    expect(parsePunchOutSetupResponse("").errors.join(" ")).toContain("Empty punchout response");
    expect(
      parsePunchOutSetupResponse("<cXML><Response><Status code=\"200\"/></Response></cXML>")
        .errors.join(" "),
    ).toContain("no StartPage URL");
  });
});

describe("parsePunchOutOrderMessage", () => {
  const orderMessage = (cookie: string) => `<?xml version="1.0"?>
<cXML><Message><PunchOutOrderMessage>
  <BuyerCookie>${cookie}</BuyerCookie>
  <ItemOut quantity="20" lineNumber="1">
    <ItemID><SupplierPartID>HD-100-PMX</SupplierPartID></ItemID>
    <ItemDetail><Description xml:lang="en">Premium Emulsion 20L</Description><UnitOfMeasure>EA</UnitOfMeasure>
    <UnitPrice><Money currency="USD">45.50</Money></UnitPrice></ItemDetail>
  </ItemOut>
  <ItemOut quantity="3" lineNumber="2">
    <ItemID><SupplierPartID>HD-200-CMT</SupplierPartID></ItemID>
    <ItemDetail><Description xml:lang="en">Portland Cement 50kg</Description><UnitOfMeasure>EA</UnitOfMeasure>
    <UnitPrice><Money currency="USD">8.25</Money></UnitPrice></ItemDetail>
  </ItemOut>
  <Total><Money currency="USD">934.75</Money></Total>
</PunchOutOrderMessage></Message></cXML>`;

  it("imports the cart with lines and a reconciled total", () => {
    const cart = parsePunchOutOrderMessage(orderMessage("cookie-123"), "cookie-123");
    expect(cart.ok).toBe(true);
    expect(cart.buyerCookie).toBe("cookie-123");
    expect(cart.lines).toHaveLength(2);
    expect(cart.lines[0]).toMatchObject({
      supplierPartId: "HD-100-PMX",
      quantity: 20,
      unitPrice: 45.5,
      unit: "EA",
      lineTotal: 910,
    });
    expect(cart.lines[1].lineTotal).toBe(24.75); // 3 × 8.25
    expect(cart.total).toBe(934.75); // 910 + 24.75, matches declared
    expect(cart.currency).toBe("USD");
  });

  it("refuses a BuyerCookie mismatch (session-tamper check)", () => {
    const cart = parsePunchOutOrderMessage(orderMessage("someone-else"), "cookie-123");
    expect(cart.ok).toBe(false);
    expect(cart.errors.join(" ")).toContain("BuyerCookie mismatch");
    expect(cart.lines).toHaveLength(0);
  });

  it("refuses a missing BuyerCookie", () => {
    const cart = parsePunchOutOrderMessage("<cXML><Message><PunchOutOrderMessage/></Message></cXML>", "cookie-123");
    expect(cart.ok).toBe(false);
    expect(cart.errors.join(" ")).toContain("no BuyerCookie");
  });

  it("refuses a total that disagrees with the line sum", () => {
    const tampered = orderMessage("cookie-123").replace("934.75", "5.00");
    const cart = parsePunchOutOrderMessage(tampered, "cookie-123");
    expect(cart.ok).toBe(false);
    expect(cart.errors.join(" ")).toContain("disagrees with the line sum");
  });

  it("excludes invalid lines with a warning, never guesses them", () => {
    const bad = `<?xml version="1.0"?>
<cXML><Message><PunchOutOrderMessage>
  <BuyerCookie>c</BuyerCookie>
  <ItemOut quantity="-5"><ItemID><SupplierPartID>BAD-1</SupplierPartID></ItemID>
    <UnitPrice><Money currency="USD">10</Money></UnitPrice></ItemOut>
  <ItemOut quantity="2"><ItemID><SupplierPartID>OK-1</SupplierPartID></ItemID>
    <UnitPrice><Money currency="USD">3</Money></UnitPrice></ItemOut>
</PunchOutOrderMessage></Message></cXML>`;
    const cart = parsePunchOutOrderMessage(bad, "c");
    expect(cart.ok).toBe(true);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].supplierPartId).toBe("OK-1");
    expect(cart.warnings.join(" ")).toContain("invalid quantity");
  });
});
