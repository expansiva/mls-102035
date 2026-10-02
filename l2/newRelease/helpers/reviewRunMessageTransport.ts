/// <mls fileReference="_102035_/l2/newRelease/helpers/reviewRunMessageTransport.ts" enhancement="_blank" />

const CENTRAL_MESSAGES_ENDPOINT = 'https://msg.collab.codes/msg';

export interface ReviewMessageRuntime {
  origin: string;
  hostname: string;
  configuredUrl: string;
  configuredCredentials: RequestCredentials;
}

export interface ReviewMessageRoute {
  url: string;
  credentials: RequestCredentials;
  useConfiguredPost: boolean;
}

export interface ReviewMessagePostDependencies {
  configuredPost: (args: Record<string, unknown>) => Promise<unknown>;
  fetchImpl: typeof fetch;
  errorFromResponse: (response: Response, args: Record<string, unknown>) => Promise<Error>;
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, '');
  return normalized === 'localhost' || normalized.endsWith('.localhost')
    || normalized === '::1' || normalized === '0.0.0.0' || /^127(?:\.\d{1,3}){3}$/u.test(normalized);
}

/** Local Studio owns the authenticated cauth cookie, so its same-origin /msg proxy is authoritative. */
export function resolveReviewMessageRoute(runtime: ReviewMessageRuntime): ReviewMessageRoute {
  if (isLoopback(runtime.hostname) && runtime.configuredUrl === CENTRAL_MESSAGES_ENDPOINT) {
    return {
      url: new URL('/msg', runtime.origin).toString(),
      credentials: 'same-origin',
      useConfiguredPost: false,
    };
  }
  return {
    url: runtime.configuredUrl,
    credentials: runtime.configuredCredentials,
    useConfiguredPost: true,
  };
}

export async function postReviewMessage<T>(
  args: Record<string, unknown>,
  runtime: ReviewMessageRuntime,
  dependencies: ReviewMessagePostDependencies,
): Promise<T> {
  const route = resolveReviewMessageRoute(runtime);
  if (route.useConfiguredPost) return dependencies.configuredPost(args) as Promise<T>;
  const response = await dependencies.fetchImpl(route.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    credentials: route.credentials,
  });
  if (response.status !== 200) throw await dependencies.errorFromResponse(response, args);
  const data = await response.json();
  if (!data) throw new Error('No data on cbePost');
  return data as T;
}
