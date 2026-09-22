import { expect, test } from "@playwright/test";

test("loads five demo brands and demonstrates analytics through report export", async ({ page, request }) => {
  const seedResponse = await request.post("/api/workspace", { data: { action: "loadDemoWorkspace" } });
  expect(seedResponse.ok()).toBeTruthy();

  await page.goto("/overview?brand=brand-1");
  await expect(page.getByRole("heading", { name: "YouTube Intelligence Hub" })).toBeVisible();
  await expect(page.getByText("Demo", { exact: true })).toHaveCount(5);
  await expect(page.getByRole("option", { name: "Aster Finance" })).toBeAttached();
  await expect(page.getByRole("option", { name: "HomeHarvest" })).toBeAttached();

  await page.getByRole("link").filter({ hasText: "Aster Finance" }).click();
  await expect(page.getByRole("heading", { name: "Aster Finance", exact: true })).toBeVisible();
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What drove performance?" })).toBeVisible();

  await page.getByRole("link", { name: "Videos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Videos", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Diagnose" }).first().click();
  await expect(page.getByRole("heading", { name: "Views since publication" })).toBeVisible();
  await expect(page.getByText("Rules are configurable in Settings.")).toBeVisible();

  await page.getByRole("link", { name: "Opportunities", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What should we create next?" })).toBeVisible();
  await page.locator("a").filter({ has: page.getByRole("heading", { level: 2 }) }).first().click();
  await expect(page.getByText("Not a performance prediction")).toBeVisible();

  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await page.getByRole("link", { name: "Build report" }).click();
  await expect(page.getByRole("heading", { name: "Build a client report" })).toBeVisible();
  await page.getByRole("button", { name: "6Export" }).click();

  const excelDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Excel" }).click();
  await expect((await excelDownload).suggestedFilename()).toMatch(/\.xlsx$/);

  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);

  await page.getByRole("button", { name: "Send test" }).click();
  await expect(page.getByRole("status")).toContainText("local preview mode");
});
