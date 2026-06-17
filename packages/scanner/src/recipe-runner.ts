import type { Browser, BrowserContext, Page } from "playwright";
import { safeGoto } from "./nav-guard.js";

export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

export interface LoginStep { action: "fill" | "click"; selector: string; valueRef?: string; }
export interface WaitFor { type: "selector" | "urlContains"; value: string; }
export interface LoginRecipeInput { loginUrl: string; steps: LoginStep[]; waitFor: WaitFor; successCheck: WaitFor; }
export type ResolveSecret = (valueRef: string) => Promise<string>;

function makeWaitPromise(page: Page, waitFor: WaitFor): Promise<void> {
  if (waitFor.type === "selector") {
    return page.waitForSelector(waitFor.value, { state: "visible", timeout: 30_000 }).then(() => undefined);
  }
  return page.waitForURL((u) => u.toString().includes(waitFor.value), { timeout: 30_000, waitUntil: "domcontentloaded" });
}

export async function executeLogin(
  browser: Browser,
  recipe: LoginRecipeInput,
  resolveSecret: ResolveSecret,
): Promise<StorageState> {
  const context = await browser.newContext();
  try {
    const page: Page = await context.newPage();
    await safeGoto(page, recipe.loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const steps = recipe.steps;
    // Find the last click step index (triggers navigation)
    let lastClickIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i]?.action === "click") lastClickIndex = i;
    }

    let waitForTriggered = false;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      if (step.action === "fill") {
        const value = step.valueRef ? await resolveSecret(step.valueRef) : "";
        await page.fill(step.selector, value, { timeout: 15_000 });
      } else if (i === lastClickIndex) {
        // Start waitFor before submit to avoid navigation race
        waitForTriggered = true;
        await Promise.all([
          makeWaitPromise(page, recipe.waitFor),
          page.click(step.selector, { timeout: 15_000 }),
        ]);
      } else {
        await page.click(step.selector, { timeout: 15_000 });
      }
    }

    // If there was no click step, wait now
    if (!waitForTriggered) {
      await makeWaitPromise(page, recipe.waitFor);
    }

    const ok = recipe.successCheck.type === "selector"
      ? await page.locator(recipe.successCheck.value).first().isVisible()
      : page.url().includes(recipe.successCheck.value);
    if (!ok) throw new Error(`Login failed: successCheck(${recipe.successCheck.type}) not satisfied`);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

export function mapRecipe(raw: { loginUrl: string; steps: unknown; waitFor: unknown; successCheck: unknown }): LoginRecipeInput {
  const steps = Array.isArray(raw.steps) ? (raw.steps as LoginStep[]) : [];
  const wf = raw.waitFor as WaitFor;
  const sc = raw.successCheck as WaitFor;
  if (typeof raw.loginUrl !== "string" || !wf?.type || !sc?.type) {
    throw new Error("Invalid login recipe shape");
  }
  return { loginUrl: raw.loginUrl, steps, waitFor: wf, successCheck: sc };
}
