import { expect, test } from "vitest";
import { isPrivateIp, assertPublicUrl, assertNavigableUrl, isPublicUrl, UnsafeUrlError } from "../src/url-guard.js";

test("isPrivateIp flags private/loopback/link-local/metadata ranges", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "172.31.255.255", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "fe80::1", "fc00::1", "fd12::1"]) {
    expect(isPrivateIp(ip), ip).toBe(true);
  }
});

test("isPrivateIp allows public addresses", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "11.0.0.1", "2606:4700:4700::1111"]) {
    expect(isPrivateIp(ip), ip).toBe(false);
  }
});

test("assertPublicUrl rejects non-http(s), localhost and private IP literals", async () => {
  await expect(assertPublicUrl("ftp://example.com")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(assertPublicUrl("http://localhost/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(assertPublicUrl("http://127.0.0.1/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data/")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(assertPublicUrl("http://[::1]/")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(assertPublicUrl("not a url")).rejects.toBeInstanceOf(UnsafeUrlError);
});

test("assertPublicUrl accepts a public IP literal without DNS", async () => {
  const u = await assertPublicUrl("https://8.8.8.8/sitemap.xml");
  expect(u.hostname).toBe("8.8.8.8");
  expect(await isPublicUrl("http://10.0.0.1/")).toBe(false);
});

test("assertPublicUrl normalizes octal/hex/decimal IPv4 literals to their dotted form", async () => {
  // WHATWG URL normalizes these to 127.0.0.1, which the guard then rejects as loopback.
  for (const raw of ["http://0177.0.0.1/", "http://0x7f.0.0.1/", "http://2130706433/"]) {
    await expect(assertPublicUrl(raw), raw).rejects.toBeInstanceOf(UnsafeUrlError);
  }
});

test("assertNavigableUrl honors the ACCESSSCAN_ALLOW_LOOPBACK test escape hatch", async () => {
  // .env.test sets ACCESSSCAN_ALLOW_LOOPBACK=1 so local 127.0.0.1 test servers are scannable.
  expect(process.env.ACCESSSCAN_ALLOW_LOOPBACK).toBe("1");
  await expect(assertNavigableUrl("http://127.0.0.1:3000/")).resolves.toBeUndefined();
});
