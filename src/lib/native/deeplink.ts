export type ParsedDeepLink = {
  pathname: string;
  search: string;
  hash: string;
};

function getAppHost() {
  const configuredHost = process.env.NEXT_PUBLIC_DEEP_LINK_HOST;
  if (configuredHost) return configuredHost;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://branches-azure.vercel.app';
    return new URL(appUrl).host;
  } catch {
    return 'branches-azure.vercel.app';
  }
}

function getCustomScheme() {
  return (process.env.NEXT_PUBLIC_DEEP_LINK_SCHEME || 'branches').toLowerCase();
}

function normalizePath(pathname: string) {
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function getCustomSchemePath(parsed: URL) {
  const hostSegment = parsed.host ? `/${parsed.host}` : '';
  const pathSegment = normalizePath(parsed.pathname);

  if (!hostSegment) return pathSegment;
  if (pathSegment === '/') return hostSegment;

  return `${hostSegment}${pathSegment}`;
}

export function parseIncomingAppUrl(rawUrl: string): ParsedDeepLink | null {
  try {
    const parsed = new URL(rawUrl);
    const customScheme = `${getCustomScheme()}:`;
    const appHost = getAppHost().toLowerCase();

    if (parsed.protocol.toLowerCase() === customScheme) {
      return {
        pathname: normalizePath(getCustomSchemePath(parsed)),
        search: parsed.search || '',
        hash: parsed.hash || '',
      };
    }

    if (parsed.host.toLowerCase() === appHost) {
      return {
        pathname: normalizePath(parsed.pathname),
        search: parsed.search || '',
        hash: parsed.hash || '',
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function toInAppPath(rawUrl: string): string | null {
  const parsed = parseIncomingAppUrl(rawUrl);
  if (!parsed) return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
