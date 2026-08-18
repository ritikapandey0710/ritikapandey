// Check if server is reachable on ports 3001 and 3005
import fs from "fs";

const results: string[] = [];

async function check(url: string, label: string) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    results.push(`${label}: STATUS=${res.status} BODY=${text.substring(0, 200)}`);
  } catch (e: any) {
    results.push(`${label}: ERROR=${e.message}`);
  }
}

async function polish(url: string, label: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Hello, I am checking your issue and will update you shortly.",
        customerName: "Test User",
        subject: "Test Ticket"
      })
    });
    const data = await res.json();
    results.push(`${label}: STATUS=${res.status} BODY=${JSON.stringify(data)}`);
  } catch (e: any) {
    results.push(`${label}: ERROR=${e.message}`);
  }
}

await check("http://localhost:3001/api/test", "Port3001_test");
await polish("http://localhost:3001/api/ai/polish", "Port3001_polish");
await check("http://localhost:3005/api/test", "Port3005_test");
await polish("http://localhost:3005/api/ai/polish", "Port3005_polish");

fs.writeFileSync("_api_test_results.txt", results.join("\n"));
console.log("Done");
