// Standalone, dependency-free verification of the Reply-Form "Polish" controller.
// Stubs globalThis.fetch so no real network/Gemini key is required.
// Run with: bun run server/_test_polish.ts
import { polishReply } from "./src/ai.controller";

type FetchRec = { url: string; init: any };
let fetchCalls: FetchRec[] = [];

function installFetch(next: (url: string, init: any) => any) {
  fetchCalls = [];
  (globalThis as any).fetch = (url: any, init?: any) => {
    const rec: FetchRec = { url: String(url), init: init || {} };
    fetchCalls.push(rec);
    return next(rec.url, rec.init);
  };
}

function makeRes(): any {
  const r: any = { statusCode: 200, body: undefined as any };
  return {
    status(code: number) { r.statusCode = code; return this; },
    json(payload: any) { r.body = payload; return this; },
    get statusCode() { return r.statusCode; },
    get body() { return r.body; },
  };
}

let pass = true;
function check(name: string, cond: boolean, detail: string) {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${cond ? "" : " -> " + detail}`);
  if (!cond) pass = false;
}

// 1) No key configured -> graceful 500, no crash
delete (process.env as any).GEMINI_API_KEY;
let res = makeRes();
await polishReply({ body: { text: "hi", agentName: "Me", customerName: "John Smith" } } as any, res);
check("no-key -> 500 'not configured'", res.statusCode === 500 && /not configured/i.test(res.body?.error || ""), `status=${res.statusCode} body=${JSON.stringify(res.body)}`);

// 2) Success path with a mocked Gemini generateContent response
(process.env as any).GEMINI_API_KEY = "test-server-key-123";
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: "Hi John, thank you for reaching out. We'll resolve your login issue shortly.\n\nBest regards,\nSarah" }] } },
    ],
  }),
}));
res = makeRes();
await polishReply({ body: { text: "fix login", agentName: "Sarah", customerName: "John Smith" } } as any, res);
check("success -> 200 + polished text", res.statusCode === 200 && typeof res.body?.polished === "string" && res.body.polished.length > 0, `status=${res.statusCode} body=${JSON.stringify(res.body)}`);
check("uses gemini-3.6-flash model", fetchCalls[0].url.includes("gemini-3.6-flash"), `url=${fetchCalls[0].url}`);
check("reads GEMINI_API_KEY from env into URL (?key=...)", fetchCalls[0].url.includes("generativelanguage.googleapis.com") && fetchCalls[0].url.includes("key=test-server-key-123"), `url=${fetchCalls[0].url}`);
check("request method POST", fetchCalls[0].init.method === "POST", `method=${fetchCalls[0].init.method}`);
check("Content-Type application/json", fetchCalls[0].init.headers?.["Content-Type"] === "application/json", `headers=${JSON.stringify(fetchCalls[0].init.headers)}`);
const sentBody = JSON.parse(fetchCalls[0].init.body);
check("body: contents[].parts[].text holds the prompt", sentBody.contents[0].parts[0].text.includes("professional Help Desk agent"), "body structure");
check("body: generationConfig maxOutputTokens=1024 temperature=0.3", sentBody.generationConfig?.maxOutputTokens === 1024 && sentBody.generationConfig?.temperature === 0.3, `genConfig=${JSON.stringify(sentBody.generationConfig)}`);
check("prompt addresses customer first name 'John'", sentBody.contents[0].parts[0].text.includes("Hi John,"), "prompt content");
check("prompt signs with agent 'Sarah'", sentBody.contents[0].parts[0].text.includes("Sarah"), "prompt content");
check("prompt requires greeting format", sentBody.contents[0].parts[0].text.includes("Start with exactly: Hi"), "prompt content");
check("prompt requires signature format", sentBody.contents[0].parts[0].text.includes("Best regards,"), "prompt content");
check("prompt forbids 'Here is the polished version:'", sentBody.contents[0].parts[0].text.includes('DO NOT include:\n- "Here is the polished version:"'), "prompt content");
check("prompt says source of truth", sentBody.contents[0].parts[0].text.includes("source of truth"), "prompt content");
check("prompt includes ticket subject context", sentBody.contents[0].parts[0].text.includes("TICKET SUBJECT"), "prompt content");
check("prompt forbids inventing info", sentBody.contents[0].parts[0].text.includes("Do not invent facts"), "prompt content");
check("prompt preserves 100% of info", sentBody.contents[0].parts[0].text.includes("Preserve 100%"), "prompt content");
check("prompt says return ONLY final reply", sentBody.contents[0].parts[0].text.includes("Return ONLY the final customer-ready reply"), "prompt content");
check("response returns { polished } only (no key leakage)", Object.keys(res.body).length === 1 && Object.keys(res.body)[0] === "polished", `bodyKeys=${JSON.stringify(Object.keys(res.body))}`);

// 3) API error path (Google returns non-2xx with an error message)
installFetch(() => ({
  ok: false,
  status: 400,
  json: async () => ({ error: { code: 400, message: "API key invalid. Please verify your key." } }),
}));
res = makeRes();
await polishReply({ body: { text: "hi", agentName: "Me", customerName: "John" } } as any, res);
check("api-error -> 500 with Gemini message", res.statusCode === 500 && /API key invalid/.test(res.body?.error || ""), `status=${res.statusCode} body=${JSON.stringify(res.body)}`);
check("api-error message does NOT mention OpenAI", !/openai/i.test((res.body?.error || "").toString()), `error=${res.body?.error}`);

// 4) Network error path (fetch throws) -> graceful 500, original text untouched by client
installFetch(() => { throw new Error("network unreachable"); });
res = makeRes();
await polishReply({ body: { text: "hi", agentName: "Me", customerName: "John" } } as any, res);
check("network-error -> 500 with message", res.statusCode === 500 && /network unreachable/.test(res.body?.error || ""), `status=${res.statusCode} body=${JSON.stringify(res.body)}`);

// 5) Empty reply text -> 400, no fetch attempted
const fetchesBeforeEmpty = fetchCalls.length;
res = makeRes();
await polishReply({ body: { text: "   " } } as any, res);
check("empty text -> 400 (no fetch attempted)", res.statusCode === 400 && fetchCalls.length === fetchesBeforeEmpty, `status=${res.statusCode} fetchCalls=${fetchCalls.length} before=${fetchesBeforeEmpty}`);

// 6) MAX_TOKENS -> 500 error (incomplete response must NOT be returned as success)
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      {
        content: { parts: [{ text: "Hi John, this is a truncated response that got cut off mid-sentence because it ran out of tokens..." }] },
        finishReason: "MAX_TOKENS",
      },
    ],
  }),
}));
res = makeRes();
await polishReply({ body: { text: "some longer reply", agentName: "Sarah", customerName: "John Smith" } } as any, res);
check("MAX_TOKENS -> 500 error (not success)", res.statusCode === 500, `status=${res.statusCode} body=${JSON.stringify(res.body)}`);
check("MAX_TOKENS -> error message mentions truncated", /truncated/i.test(res.body?.error || ""), `body=${res.body?.error}`);

// 7) Empty Gemini response -> 500 error
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: "" }] } }] }),
}));
res = makeRes();
await polishReply({ body: { text: "hi", agentName: "Sarah", customerName: "John" } } as any, res);
check("empty gemini response -> 500 error", res.statusCode === 500 && /empty/i.test(res.body?.error || ""), `status=${res.statusCode} body=${JSON.stringify(res.body)}`);

// === EXAMPLE 1: Short technical support reply ===
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: "Hi Mark,\n\nWe looked into your network connectivity issue and confirmed the DHCP settings are correct. Please try reconnecting to the network and let us know if the problem continues.\n\nBest regards,\nDavid Chen" }] } },
    ],
  }),
}));
res = makeRes();
const example1Req = {
  subject: "Network connectivity issue in office",
  text: "Checked the network setup. The DHCP is configured properly. Try reconnecting and see if it works.",
  agentName: "David Chen",
  customerName: "Mark Johnson",
};
await polishReply({ body: example1Req } as any, res);
check("example1: short technical support reply -> 200", res.statusCode === 200, `status=${res.statusCode}`);
const ex1Prompt = JSON.parse(fetchCalls[0].init.body).contents[0].parts[0].text;
check("example1: subject is in prompt as context", ex1Prompt.includes("Network connectivity issue in office"), "prompt missing subject");
check("example1: original reply is in prompt as source of truth", ex1Prompt.includes("source of truth") && ex1Prompt.includes("Checked the network setup"), "prompt missing original reply");
check("example1: customer first name 'Mark' in prompt", ex1Prompt.includes("Hi Mark,"), "prompt missing customer name");
check("example1: agent name 'David Chen' in prompt", ex1Prompt.includes("David Chen"), "prompt missing agent name");

// === EXAMPLE 2: Longer reply containing multiple details ===
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: "Hi Priya,\n\nThank you for providing the transaction details. We have verified your payment and can confirm the full refund of $129.99 has been processed back to your original payment method. It will take 5-7 business days to reflect. We have also reopened your account access as requested, and the coupon code WELCOME10 has been applied for your next order. Please let us know if you need any further assistance.\n\nBest regards,\nAmanda Wilson" }] } },
    ],
  }),
}));
res = makeRes();
const example2Req = {
  subject: "Refund inquiry for order #4781",
  text: "We verified your payment. The full refund of $129.99 has been processed back to your original payment method. It takes 5-7 business days to reflect. We also reopened your account access as requested and applied the coupon code WELCOME10 for your next order.",
  agentName: "Amanda Wilson",
  customerName: "Priya Sharma",
};
await polishReply({ body: example2Req } as any, res);
check("example2: longer reply with multiple details -> 200", res.statusCode === 200, `status=${res.statusCode}`);
const ex2Prompt = JSON.parse(fetchCalls[0].init.body).contents[0].parts[0].text;
check("example2: subject is in prompt as context", ex2Prompt.includes("Refund inquiry for order #4781"), "prompt missing subject");
check("example2: refund amount preserved in prompt", ex2Prompt.includes("$129.99"), "prompt lost refund amount");
check("example2: timeline preserved in prompt", ex2Prompt.includes("5-7 business days"), "prompt lost timeline");
check("example2: account access preserved in prompt", ex2Prompt.includes("reopened your account"), "prompt lost account access detail");
check("example2: coupon code preserved in prompt", ex2Prompt.includes("WELCOME10"), "prompt lost coupon code");
check("example2: customer first name 'Priya' in prompt", ex2Prompt.includes("Hi Priya,"), "prompt missing customer name");
check("example2: agent name 'Amanda Wilson' in prompt", ex2Prompt.includes("Amanda Wilson"), "prompt missing agent name");

// === EXAMPLE 3: Subject provides context, original reply contains the actual solution ===
installFetch(() => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: "Hi Robert,\n\nThank you for contacting us about the password reset issue. We checked your account and have reset the password as requested. Please try logging in again with the new credentials we sent to your registered email. If you need any further help, feel free to reach out.\n\nBest regards,\nJessica Miller" }] } },
    ],
  }),
}));
res = makeRes();
const example3Req = {
  subject: "Password reset not working",
  text: "We checked your account and reset the password. Please try logging in again.",
  agentName: "Jessica Miller",
  customerName: "Robert Brown",
};
await polishReply({ body: example3Req } as any, res);
check("example3: subject context + original solution -> 200", res.statusCode === 200, `status=${res.statusCode}`);
const ex3Prompt = JSON.parse(fetchCalls[0].init.body).contents[0].parts[0].text;
check("example3: subject 'Password reset' in prompt as context", ex3Prompt.includes("Password reset not working"), "prompt missing subject");
check("example3: actual solution (reset password) preserved", ex3Prompt.includes("reset the password"), "prompt lost actual solution");
check("example3: original reply preserved as source of truth", ex3Prompt.includes("Please try logging in again"), "prompt missing original reply");
check("example3: customer first name 'Robert' in prompt", ex3Prompt.includes("Hi Robert,"), "prompt missing customer name");
check("example3: agent name 'Jessica Miller' in prompt", ex3Prompt.includes("Jessica Miller"), "prompt missing agent name");

console.log(`\n${pass ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
if (!pass) process.exit(1);