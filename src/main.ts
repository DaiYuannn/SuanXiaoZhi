import { parseFrontendEnv } from "./shared/config/env.js";

const resolveFrontendEnvInput = (): Record<string, string | undefined> => {
  if (typeof import.meta !== "undefined") {
    const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
    if (metaEnv) {
      return {
        ...metaEnv,
        NODE_ENV: metaEnv.NODE_ENV ?? metaEnv.MODE ?? "development"
      };
    }
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }

  return { NODE_ENV: "development" };
};

const env = parseFrontendEnv(resolveFrontendEnvInput());

export const bootstrap = (): string => {
  return `frontend-ready:${env.NODE_ENV}`;
};

export const mountApp = async (): Promise<void> => {
  if (typeof document === "undefined") {
    return;
  }

  await import("@fortawesome/fontawesome-free/css/all.min.css");
  await import("./styles/index.css");

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const routerLoaders = (
    import.meta as ImportMeta & {
      glob: (pattern: string) => Record<string, () => Promise<unknown>>;
    }
  ).glob("./router/index.tsx");
  const loadRouterModule = routerLoaders["./router/index.tsx"];
  if (!loadRouterModule) {
    throw new Error("router-entry-not-found");
  }

  const { AppRouterProvider } = (await loadRouterModule()) as {
    AppRouterProvider: () => React.JSX.Element;
  };

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  createRoot(rootElement).render(React.createElement(React.StrictMode, null, React.createElement(AppRouterProvider)));
};

if (typeof document !== "undefined") {
  void mountApp();
}