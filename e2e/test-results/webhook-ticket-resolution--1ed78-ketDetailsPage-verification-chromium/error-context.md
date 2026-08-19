# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: webhook-ticket-resolution.spec.ts >> Webhook Ticket Resolution — Password Reset End-to-End >> One webhook ticket → KB auto-resolve → conversation → summary → TicketDetailsPage verification
- Location: e2e\tests\webhook-ticket-resolution.spec.ts:54:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h2').first()
Expected substring: "Password Reset Issues"
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h2').first()
    - waiting for "http://localhost:5173/tickets/e154ead3-c30e-4100-8f62-678ce5985dce" navigation to finish...
    - navigated to "http://localhost:5173/tickets/e154ead3-c30e-4100-8f62-678ce5985dce"
  - Test timeout of 180000ms exceeded.

```

```yaml
- complementary:
  - text: Help Desk
  - navigation:
    - list:
      - listitem:
        - link "Dashboard":
          - /url: /
      - listitem:
        - link "Tickets":
          - /url: /tickets
      - listitem:
        - link "Users":
          - /url: /user
  - button "Sign Out"
- banner:
  - heading "Help Desk" [level=1]
  - text: A
  - paragraph: Admin User
  - paragraph: admin@example.com
  - button "Sign Out"
- main
```

# Test source

```ts
  131 |       // STEP 4 — Verify the resolution reply (agent responds with KB solution)
  132 |       // ══════════════════════════════════════════════════════════════════
  133 |       console.log('\n=== STEP 4: Verify resolution reply ===');
  134 |       const repliesRes = await adminApi.get(`/api/tickets/${ticketId}/replies`);
  135 |       const replies: any[] = await repliesRes.json();
  136 |       console.log(`  Replies found: ${replies.length}`);
  137 | 
  138 |       const agentReply = replies.find((r: any) => r.senderType === 'AGENT');
  139 |       expect(agentReply, 'Expected an AGENT reply with the KB resolution').toBeTruthy();
  140 |       expect(agentReply.body.toLowerCase()).toContain('password reset');
  141 |       report['Agent Reply'] = `Agent reply with KB resolution (${agentReply.body.substring(0, 60)}...)`;
  142 |       console.log(`  ✓ Agent reply found: ${agentReply.body.substring(0, 80)}...`);
  143 | 
  144 |       // ══════════════════════════════════════════════════════════════════
  145 |       // STEP 5 — Add customer confirmation reply (customer ↔ agent conversation)
  146 |       // ══════════════════════════════════════════════════════════════════
  147 |       console.log('\n=== STEP 5: Add customer confirmation ===');
  148 | 
  149 |       await signInViaApi(customerApi, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  150 | 
  151 |       const replyRes = await customerApi.post(`/api/tickets/${ticketId}/replies`, {
  152 |         data: { body: CUSTOMER_CONFIRMATION },
  153 |         headers: { 'Content-Type': 'application/json' },
  154 |       });
  155 |       expect(replyRes.ok(), `Customer reply failed: ${replyRes.status()}`).toBeTruthy();
  156 |       console.log('  ✓ Customer confirmation reply added');
  157 | 
  158 |       // Verify the customer's reply has senderType CUSTOMER
  159 |       const updatedRepliesRes = await adminApi.get(`/api/tickets/${ticketId}/replies`);
  160 |       const updatedReplies: any[] = await updatedRepliesRes.json();
  161 |       const customerReply = updatedReplies.find(
  162 |         (r: any) => r.body === CUSTOMER_CONFIRMATION
  163 |       );
  164 |       expect(customerReply, 'Expected the customer confirmation reply').toBeTruthy();
  165 |       expect(customerReply.senderType).toBe('CUSTOMER');
  166 |       report['Customer Reply'] = `Customer confirmation reply (senderType: ${customerReply.senderType})`;
  167 |       console.log(`  ✓ Customer reply senderType = ${customerReply.senderType}`);
  168 |       report['Replies Count'] = `${updatedReplies.length} (Agent + Customer)`;
  169 | 
  170 |       // ══════════════════════════════════════════════════════════════════
  171 |       // STEP 6 — Mark the ticket as Resolved
  172 |       // ══════════════════════════════════════════════════════════════════
  173 |       console.log('\n=== STEP 6: Ensure ticket is Resolved ===');
  174 |       // The webhook already set status to RESOLVED via KB auto-resolution.
  175 |       // We explicitly ensure it here via the existing PATCH endpoint.
  176 |       const updateRes = await adminApi.patch(`/api/tickets/${ticketId}`, {
  177 |         data: { status: 'RESOLVED' },
  178 |         headers: { 'Content-Type': 'application/json' },
  179 |       });
  180 |       expect(updateRes.ok()).toBeTruthy();
  181 |       const updatedTicket = await updateRes.json();
  182 |       expect(updatedTicket.status).toBe('RESOLVED');
  183 |       console.log(`  ✓ Ticket status confirmed: ${updatedTicket.status}`);
  184 | 
  185 |       // ══════════════════════════════════════════════════════════════════
  186 |       // STEP 7 — Generate AI conversation summary from actual chat messages
  187 |       // ══════════════════════════════════════════════════════════════════
  188 |       console.log('\n=== STEP 7: Generate AI conversation summary ===');
  189 |       // The existing /api/ai/summarize endpoint fetches the ticket AND all
  190 |       // replies from the database — it summarises actual messages, no invention.
  191 |       const summaryRes = await adminApi.post('/api/ai/summarize', {
  192 |         data: { ticketId },
  193 |         headers: { 'Content-Type': 'application/json' },
  194 |       });
  195 | 
  196 |       let summaryText: string | null = null;
  197 |       if (summaryRes.ok()) {
  198 |         const summaryData = await summaryRes.json();
  199 |         summaryText = summaryData.summary || summaryData.text || null;
  200 |         if (summaryText) {
  201 |           console.log(`  ✓ Summary generated (${summaryText.length} chars)`);
  202 |           console.log(`  Preview: ${summaryText.substring(0, 120)}...`);
  203 |           report['Summary'] = `Generated (${summaryText.length} chars)`;
  204 |         }
  205 |       } else {
  206 |         console.log(`  ⚠ Summary API returned ${summaryRes.status()}`);
  207 |         report['Summary'] = `API returned ${summaryRes.status()}`;
  208 |       }
  209 | 
  210 |       // ══════════════════════════════════════════════════════════════════
  211 |       // STEP 8 — UI Verification via the existing Ticket Details page
  212 |       // ══════════════════════════════════════════════════════════════════
  213 |       console.log('\n=== STEP 8: UI Verification ===');
  214 | 
  215 |       // Login as admin in the browser
  216 |       await page.goto('/login', { waitUntil: 'networkidle' });
  217 |       await page.fill('input[placeholder="Enter your email address"]', ADMIN_EMAIL);
  218 |       await page.fill('input[placeholder="Enter your password"]', ADMIN_PASSWORD);
  219 |       await page.click('button[type="submit"]');
  220 |       await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 15000 });
  221 | 
  222 |       // Navigate to the Ticket Details page
  223 |       await page.goto(`/tickets/${ticketId}`, { waitUntil: 'networkidle' });
  224 |       await page.waitForTimeout(3000);
  225 | 
  226 |       // ── Verify ticket information ─────────────────────────────────────
  227 |       console.log('  → Verifying ticket information...');
  228 | 
  229 |       // Ticket title in header h2
  230 |       const titleHeading = page.locator('h2').first();
> 231 |       await expect(titleHeading).toContainText(TICKET_TITLE);
      |                                  ^ Error: expect(locator).toContainText(expected) failed
  232 | 
  233 |       // Status badge — look for a badge/span containing "Resolved"
  234 |       await expect(page.locator('span').filter({ hasText: /^Resolved$/ })).toBeVisible({ timeout: 10000 });
  235 | 
  236 |       // Category badge
  237 |       await expect(page.locator('text=General Question').first()).toBeVisible({ timeout: 5000 });
  238 | 
  239 |       // Sender information
  240 |       await expect(page.locator('text=Test Customer').first()).toBeVisible({ timeout: 5000 });
  241 | 
  242 |       // Description content
  243 |       await expect(page.locator('text=/forgot my password/i').first()).toBeVisible({ timeout: 5000 });
  244 | 
  245 |       // ── Verify complete chat / conversation ───────────────────────────
  246 |       console.log('  → Verifying conversation...');
  247 | 
  248 |       // Replies section header
  249 |       await expect(page.locator('h3:has-text("Replies")').first()).toBeVisible({ timeout: 10000 });
  250 | 
  251 |       // Agent label + resolution text
  252 |       const agentLoc = page.locator('text=Agent').first();
  253 |       await expect(agentLoc).toBeVisible();
  254 |       // The resolution text from the KB should be visible
  255 |       await expect(page.locator('text=/password reset/i').first()).toBeVisible({ timeout: 10000 });
  256 |       // Agent author name (bot user)
  257 |       await expect(page.locator('text=Support Bot').first()).toBeVisible({ timeout: 5000 });
  258 | 
  259 |       // Customer label + confirmation text
  260 |       const customerLoc = page.locator('text=Customer').first();
  261 |       await expect(customerLoc).toBeVisible();
  262 |       // The customer confirmation reply should be visible
  263 |       await expect(page.locator('text=/fully resolved/i').first()).toBeVisible({ timeout: 10000 });
  264 | 
  265 |       // ── Verify conversation summary (via UI "Summarize" button) ──────
  266 |       console.log('  → Verifying AI summary in UI...');
  267 |       const summarizeButton = page.getByRole('button', { name: /summarize/i });
  268 |       await expect(summarizeButton).toBeVisible({ timeout: 10000 });
  269 |       await summarizeButton.click();
  270 | 
  271 |       // Wait for the summary to be generated (Gemini API call)
  272 |       await page.waitForTimeout(15000);
  273 | 
  274 |       // Verify the summary appears in the UI (replaces the hint text)
  275 |       // The summary container has class "bg-slate-50" on success, "bg-red-50" on error
  276 |       const summarySuccessContainer = page.locator('div.bg-slate-50');
  277 |       if (await summarySuccessContainer.count() > 0) {
  278 |         const uiSummary = await summarySuccessContainer.textContent();
  279 |         expect(uiSummary!.trim().length).toBeGreaterThan(30);
  280 |         console.log(`  ✓ Summary displayed in UI (${uiSummary!.length} chars)`);
  281 |         report['UI Summary'] = 'Displayed ✓';
  282 |       } else {
  283 |         // Check if there's an error container
  284 |         const errorContainer = page.locator('div.bg-red-50');
  285 |         if (await errorContainer.count() > 0) {
  286 |           const errText = await errorContainer.textContent();
  287 |           console.log(`  ⚠ Summary error in UI: ${errText?.substring(0, 100)}`);
  288 |           report['UI Summary'] = 'Error shown in UI';
  289 |         } else {
  290 |           console.log('  ⚠ Summary container not found in UI');
  291 |           report['UI Summary'] = 'Not found';
  292 |         }
  293 |       }
  294 | 
  295 |       // ── Verify resolved status is displayed ──────────────────────
  296 |       console.log('  → Verifying resolved status display...');
  297 |       await expect(page.locator('text=Resolved').first()).toBeVisible({ timeout: 5000 });
  298 | 
  299 |       console.log('\n=== TEST COMPLETE ===');
  300 |     } finally {
  301 |       // Print full report
  302 |       console.log('\n═══════════════════════════════════════════════════');
  303 |       console.log('FINAL REPORT — Webhook Ticket Resolution E2E');
  304 |       console.log('═══════════════════════════════════════════════════');
  305 |       for (const [key, value] of Object.entries(report)) {
  306 |         console.log(`  ${key}: ${value}`);
  307 |       }
  308 |       console.log('═══════════════════════════════════════════════════');
  309 | 
  310 |       await adminApi.dispose();
  311 |       await customerApi.dispose();
  312 |     }
  313 |   });
  314 | });
  315 | 
```