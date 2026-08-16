import { defineConfig } from "@solidjs/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

const basePath = process.env.BASE_PATH?.trim();
const forceSsgPrerender = process.env.CI_SSG_PRERENDER === "true";
const normalizedBasePath =
  !basePath || basePath === "/" ? "" : `/${basePath.replace(/^\/+|\/+$/g, "")}`;
const solidServerBaseUrlPlugin = {
  name: "solid-server-base-url",
  enforce: "post" as const,
  configResolved(config: { define?: Record<string, string> }) {
    config.define ??= {};
    config.define["import.meta.env.SERVER_BASE_URL"] = JSON.stringify(normalizedBasePath);
  },
};

const ciPrerenderConfig = forceSsgPrerender
  ? {
      routes: ["/"],
      crawlLinks: true,
    }
  : undefined;

export default defineConfig({
  server: {
    baseURL: normalizedBasePath,
    ...(ciPrerenderConfig ? { prerender: ciPrerenderConfig } : {}),
  },
  vite: {
    plugins: [lucidePreprocess(), tsconfigPaths(), solidServerBaseUrlPlugin],
    optimizeDeps: {
      // these are required for solid-markdown to work
      include: ["solid-markdown > micromark", "solid-markdown > unified"],
    },
  },
});
