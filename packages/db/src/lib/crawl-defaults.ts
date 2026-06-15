export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  sameDomainDelaySecs: number;
  respectRobotsTxt: boolean;
  includePatterns: string[];
  excludePatterns: string[];
}

export const defaultCrawlConfig: CrawlConfig = {
  maxPages: 500,
  maxDepth: 4,
  concurrency: 4,
  sameDomainDelaySecs: 1,
  respectRobotsTxt: true,
  includePatterns: [],
  excludePatterns: [],
};
