import { test, expect } from "@playwright/test";
const screens = [
  "home",
  "caregiver",
  "employer",
  "signin",
  "workspace",
  "profile-edit",
  "profile",
  "discovery",
  "shortlist",
  "contacts",
  "account",
  "identity",
  "membership",
  "support",
  "privacy",
  "admin",
  "legal",
  "regional",
  "guest",
];
async function layout(page, label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect(),
          s = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.right > innerWidth + 2 &&
          s.visibility !== "hidden" &&
          s.display !== "none"
        );
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        width: Math.round(el.getBoundingClientRect().width),
        right: Math.round(el.getBoundingClientRect().right),
      })),
  }));
  expect(
    result.width,
    `${label}: horizontal overflow ${JSON.stringify(result.offenders)}`,
  ).toBeLessThanOrEqual(result.viewport + 1);
}
test("public and account layouts fit the viewport", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  for (const screen of screens) {
    const url = `/tests/responsive/index.html?screen=${screen}`;
    try {
      await page.goto(url);
    } catch (error) {
      if (!error.message.includes("ERR_NETWORK_CHANGED")) throw error;
      await page.goto(url);
    }
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".spinner")).toHaveCount(0);
    if (screen === "home") {
      await layout(page, "home with cookie notice");
      const decline = page.getByRole("button", { name: /Decline optional/ });
      if (await decline.count()) await decline.click();
      const menu = page.getByRole("button", { name: "Open navigation" });
      if (await menu.isVisible()) {
        await menu.click();
        await layout(page, "open mobile menu");
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
      await page
        .getByRole("button", { name: "Mlezi Help", exact: true })
        .click();
      await layout(page, "open help panel");
      await page.getByRole("button", { name: "Close Mlezi Help" }).click();
    }
    if (screen === "profile-edit")
      await page
        .getByRole("button", { name: "Edit profile ↗", exact: true })
        .click();
    if (screen === "support")
      await page.getByRole("button", { name: /Example support issue/ }).click();
    if (screen === "discovery")
      await page
        .locator(".search-form details")
        .evaluateAll((nodes) => nodes.forEach((node) => (node.open = true)));
    await layout(page, screen);
    if (page.viewportSize().width <= 900) {
      const small = await page
        .locator("input:not([type=checkbox]):not([type=radio]),select,textarea")
        .evaluateAll((nodes) =>
          nodes
            .filter(
              (e) =>
                e.getBoundingClientRect().width > 0 &&
                getComputedStyle(e).visibility !== "hidden" &&
                parseFloat(getComputedStyle(e).fontSize) < 16,
            )
            .map((e) => e.name || e.tagName),
        );
      expect(small, `${screen}: mobile control text`).toEqual([]);
    }
    expect(errors, `${screen}: browser exceptions`).toEqual([]);
    if (
      ["home", "caregiver", "profile-edit"].includes(screen) &&
      ["chromium-390", "chromium-1440"].includes(testInfo.project.name)
    )
      await page.screenshot({
        path: testInfo.outputPath(`${screen}.png`),
        fullPage: true,
      });
  }
});
