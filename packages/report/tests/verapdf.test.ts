import { afterEach, expect, test } from "vitest";
import { validatePdf } from "../src/verapdf.js";

const saved = process.env.VERAPDF_PATH;
afterEach(() => { if (saved === undefined) delete process.env.VERAPDF_PATH; else process.env.VERAPDF_PATH = saved; });

test("validatePdf returns null when VERAPDF_PATH is unset (skip)", async () => {
  delete process.env.VERAPDF_PATH;
  expect(await validatePdf(Buffer.from("%PDF-1.7"))).toBeNull();
});
