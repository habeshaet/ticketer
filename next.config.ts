import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop app source is read at request time when packaging the zip,
  // so make sure those files travel with the build output.
  outputFileTracingIncludes: {
    "/api/export/desktop": ["./desktop/**"],
    "/api/export/desktop-file": ["./desktop/**"],
  },
};

export default nextConfig;
