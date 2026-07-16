const normalizeBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
};

export const getConfiguredAppBaseUrl = () =>
  normalizeBaseUrl(process.env.SERVICE_URL_APP) ??
  normalizeBaseUrl(process.env.APP_BASE_URL);

export const getAppBaseUrl = (
  request?: Request,
  fallback = "http://localhost:3000",
) =>
  getConfiguredAppBaseUrl() ??
  (request ? normalizeBaseUrl(new URL(request.url).origin) : undefined) ??
  normalizeBaseUrl(fallback) ??
  "";

export const isConfiguredAppBaseUrlSecure = () =>
  getConfiguredAppBaseUrl()?.startsWith("https://") ?? false;
