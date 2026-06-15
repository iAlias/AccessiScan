import { expect, test } from "vitest";
import { canonicalizeUrl } from "../src/canonical-url.js";

test("lowercases host and strips fragment + userinfo", () => {
  expect(canonicalizeUrl("https://User:pw@WWW.Pam.IT/a#frag")).toBe("https://www.pam.it/a");
});
test("drops default ports", () => {
  expect(canonicalizeUrl("http://a.it:80/x")).toBe("http://a.it/x");
  expect(canonicalizeUrl("https://a.it:443/x")).toBe("https://a.it/x");
});
test("drops tracking params and sorts the rest", () => {
  expect(canonicalizeUrl("https://a.it/?b=2&utm_source=x&a=1&gclid=z")).toBe("https://a.it/?a=1&b=2");
});
test("strips trailing slash but keeps root slash", () => {
  expect(canonicalizeUrl("https://a.it/path/")).toBe("https://a.it/path");
  expect(canonicalizeUrl("https://a.it")).toBe("https://a.it/");
});
test("resolves relative against base", () => {
  expect(canonicalizeUrl("/about", "https://a.it/x/y")).toBe("https://a.it/about");
});
test("rejects non-http(s) and unparseable", () => {
  expect(canonicalizeUrl("mailto:x@a.it")).toBeNull();
  expect(canonicalizeUrl("javascript:void(0)")).toBeNull();
  expect(canonicalizeUrl("not a url")).toBeNull();
});
