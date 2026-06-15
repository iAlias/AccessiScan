import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@accessscan/db", "@accessscan/validation", "@accessscan/scanner"],
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@axe-core/playwright",
    "chromium-bidi",
  ],
  webpack: (cfg, { isServer }) => {
    cfg.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    if (isServer) {
      const existingExternals = cfg.externals ?? [];
      const previousExternals = Array.isArray(existingExternals)
        ? existingExternals
        : [existingExternals];
      cfg.externals = [
        ...previousExternals,
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (
            request &&
            (request.startsWith("playwright") ||
              request.startsWith("playwright-core") ||
              request.startsWith("@axe-core/playwright") ||
              request.startsWith("chromium-bidi"))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return cfg;
  },
};

export default config;
