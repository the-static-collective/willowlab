import {readFile} from "node:fs/promises";
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
  await expect(page.locator("#draft-output")).toHaveValue(/Lloyd Management/);
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
  // A source-backed Mission Control brief should be useful without network requests.
  await page.getByRole("button",{name:"Brief me on next moves"}).click();
  await expect(page.locator("#mission-brief")).toContainText("Lloyd Management");
  await expect(page.locator("#mission-brief")).toContainText("Rule-based suggestions only");
  await page.getByRole("button",{name:"Show selected reasoning receipt"}).click();
  await expect(page.locator("#mission-brief")).toContainText("MOTIF_INSPIRED");
  await expect(page.locator("#mission-brief")).toContainText("NOT_GRANTED");

  // Nebula is a manual source review; no API/CRM/outreach network call.
  await page.locator("#nebula-scope").selectOption("selected");
  await page.getByRole("button",{name:"Prepare Nebula packet"}).click();
  await expect(page.locator("#nebula-prompt")).toHaveValue(/WMS Master/);
  await expect(page.locator("#nebula-prompt")).toHaveValue(/willowlab.nebula-review-return\/v1/);
  const [nebulaDownload]=await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button",{name:"Export packet JSON"}).click()
  ]);
  const packet=JSON.parse(await readFile(await nebulaDownload.path(),"utf8"));
  expect(packet.schema).toBe("willowlab.nebula-handoff/v1");
  expect(packet.permissions.wms_sync).toBe(false);
  expect(packet.permissions.provider_send).toBe(false);
  const returnNote={schema:"willowlab.nebula-review-return/v1",packet_id:packet.packet_id,
    source_revision:packet.source.revision,
    claimed_effects:{wms_write:false,outreach_sent:false,owner_approval:false},
    annotations:[{candidate_id:packet.candidates[0].candidate.id,
      state:"NEEDS_OWNER_DECISION",
      question:"Does Willow serve this property type?",
      notes:"Human should compare current governing WMS policy and source."}]};
  await page.locator("#nebula-return-file").setInputFiles({
    name:"nebula-review.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(returnNote))
  });
  await expect(page.locator("#nebula-return")).toContainText("NEEDS_OWNER_DECISION");
  await expect(page.locator("#nebula-status")).toContainText("Zero Sprint, WMS");
  await expect(page.locator("#metric-total")).toHaveText("4");
  expect(outgoing).toEqual([]);
});
