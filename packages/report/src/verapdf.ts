import { randomBytes } from "node:crypto";
import { writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Returns true/false from veraPDF, or null when no validator is configured (skip). */
export async function validatePdf(buf: Buffer): Promise<boolean | null> {
  const bin = process.env.VERAPDF_PATH;
  if (!bin) return null;
  const tmp = join(tmpdir(), `accessscan-${randomBytes(8).toString("hex")}.pdf`);
  try {
    await writeFile(tmp, buf);
    const { stdout } = await run(bin, ["--flavour", "ua1", tmp], { maxBuffer: 10 * 1024 * 1024 });
    return /compliant="true"|"isCompliant":\s*true/i.test(stdout);
  } catch {
    return false;
  } finally {
    await rm(tmp, { force: true });
  }
}
