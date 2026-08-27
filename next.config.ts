import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json on ~/Desktop makes Turbopack infer that as the
  // workspace root, which breaks module resolution ([project]/... points above
  // this app). Pin the root to this directory.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Native / heavy Node-only deps must not be bundled by the server compiler —
  // they use dynamic requires at runtime. @napi-rs/canvas is a native binary
  // pdfjs-dist (used by pdf-parse) optionally requires — without it present
  // as a real dependency, that require throws instead of degrading quietly.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
