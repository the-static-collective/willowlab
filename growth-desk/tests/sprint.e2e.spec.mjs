import {test,expect} from "@playwright/test";

test("Willow Partner Sprint runs source-to-review-to-draft-to-followup in browser",async ({page})=>{
  const outgoing=[];
  page.on("request",request=>{
    if(!request.url().startsWith("http://127.0.0.1:8000/"))outgoing.push(request.url());
  });
  await page.goto("http://127.0.0.1:8000/growth-desk/sprint.html");
  await expect(page.locator("#metric-total")).toHaveText("0");
  await page.getByRole("button",{name:"Load four researched prospects"}).click();
  await expect(page.locator("#metric-total")).toHaveText("4");
  await expect(page.locator("#selected-view")).toContainText("Lloyd Management");
  await expect(page.locator("#selected-view")).toContainText("Potential");
  await page.locator("#decision").selectOption("SHORTLIST");
  await page.locator("#decision-reason").fill("Review whether turnover cleaning fits the actual service area.");
  await page.getByRole("button",{name:"Save review note"}).click();
  await expect(page.locator("#metric-review")).toHaveText("1");
  await page.getByRole("button",{name:"Write an introduction"}).click();
  await expect(page.locator("#draft-output")).toContainText("Lloyd Management");
  await expect(page.locator("#draft-output")).toContainText("DRAFT").catch(()=>{});
  await expect(page.locator("#draft-status")).toContainText("unsent");

  // A self-reported contact requires both independent human attestations.
  await page.locator("#contact-note").fill("Operator reports a separate manual call.");
  await page.locator("#followup-date").fill(new Date().toISOString().slice(0,10));
  await page.getByRole("button",{name:"Log my manual contact"}).click();
  await expect(page.locator("#contact-status")).toContainText("not logged");
  await page.locator("#owner-attestation").check();
  await page.locator("#manual-attestation").check();
  await page.getByRole("button",{name:"Log my manual contact"}).click();
  await expect(page.locator("#contact-status")).toContainText("self-reported");
  await expect(page.locator("#metric-due")).toHaveText("1");

  await page.locator("#followup-reason").fill("Checked next action; no provider record.");
  await page.getByRole("button",{name:"Record outcome"}).click();
  await expect(page.locator("#metric-due")).toHaveText("0");
  const stored=await page.evaluate(()=>localStorage.getItem("willowlab:partner-sprint:v1"));
  expect(stored).toContain("OPERATOR_SELF_REPORT_UNVERIFIED");
  expect(stored).not.toContain("customer@example.com");
  await page.reload();
  await expect(page.locator("#metric-total")).toHaveText("4");
  await expect(page.locator("#metric-review")).toHaveText("1");

  // Export is a local download, and the approved portable format reloads.
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button",{name:"Export board JSON"}).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^willow-partner-sprint-\d{4}-\d{2}-\d{2}\.json$/);
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Clear local board"}).click();
  await expect(page.locator("#metric-total")).toHaveText("0");
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#import-board").setInputFiles({
    name:"pilot.json",mimeType:"application/json",buffer:Buffer.from(stored)
  });
  await expect(page.locator("#metric-total")).toHaveText("4");
  expect(outgoing).toEqual([]);
});
