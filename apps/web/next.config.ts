import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@accessscan/db", "@accessscan/validation"],
};

export default config;
