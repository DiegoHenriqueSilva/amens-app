export const NATIVE_AUTH_REDIRECT = "com.amens.app://auth/callback";

export function parseNativeAuthCallback(value: string): { code: string | null; error: boolean } | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "com.amens.app:" || url.hostname !== "auth" || url.pathname !== "/callback"
    || url.username || url.password || url.port) return null;

  const hash = new URLSearchParams(url.hash.slice(1));
  return {
    code: url.searchParams.get("code"),
    error: url.searchParams.has("error") || url.searchParams.has("error_description")
      || hash.has("error") || hash.has("error_description"),
  };
}
