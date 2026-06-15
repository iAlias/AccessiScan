import robotsParser from "robots-parser";

export interface RobotsInfo {
  sitemaps: string[];
  crawlDelaySecs: number | undefined;
  isAllowed: (url: string) => boolean;
}

export async function loadRobots(
  origin: string,
  ua: string,
  fetchText: (u: string) => Promise<string | null>,
): Promise<RobotsInfo> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const body = (await fetchText(robotsUrl)) ?? "";
  const r = robotsParser(robotsUrl, body);
  return {
    sitemaps: r.getSitemaps(),
    crawlDelaySecs: r.getCrawlDelay(ua),
    isAllowed: (url: string) => r.isAllowed(url, ua) ?? true,
  };
}
