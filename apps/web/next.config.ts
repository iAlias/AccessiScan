import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const config: NextConfig = {
  transpilePackages: ["@accessscan/db", "@accessscan/validation"],
  webpack(webpackConfig: Configuration) {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return webpackConfig;
  },
};

export default config;
