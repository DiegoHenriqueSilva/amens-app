export interface OtaPayload {
  schema: number;
  compatibilityId: string;
  nativeVersionCode: number;
  nativeFingerprint: string;
  releaseId: string;
  sequence: number;
  url: string;
  checksum: string;
  zipSignature: string;
}
export interface OtaEnvelope { payload: OtaPayload; signature: string }
type Expected = { origin: string; compatibilityId: string; nativeVersionCode: number; fingerprint: string; publicKey: string };
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export async function verifyOtaManifest(value: unknown, expected: Expected): Promise<OtaPayload> {
  const envelope = value as OtaEnvelope;
  const payload = envelope?.payload;
  if (!payload || typeof envelope.signature !== "string" || payload.schema !== 1
    || payload.compatibilityId !== expected.compatibilityId || payload.nativeVersionCode !== expected.nativeVersionCode
    || payload.nativeFingerprint !== expected.fingerprint || !Number.isSafeInteger(payload.sequence) || payload.sequence < 1
    || !/^release-\d{13}-[a-f0-9]{8}$/.test(payload.releaseId) || !/^[a-f0-9]{64}$/.test(payload.checksum)
    || typeof payload.zipSignature !== "string" || payload.zipSignature.length > 2048
    || payload.url !== `${expected.origin}/app-updates/${expected.compatibilityId}/${payload.releaseId}.zip`) {
    throw new Error("Invalid or incompatible OTA manifest.");
  }
  const key = await crypto.subtle.importKey("spki", decode(expected.publicKey.replace(/-----[^-]+-----|\s/g, "")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(envelope.signature), new TextEncoder().encode(JSON.stringify(payload)))) {
    throw new Error("OTA manifest signature verification failed.");
  }
  return payload;
}

export function shouldDownloadRelease(payload: OtaPayload, state: {
  current: string; next: string | null; blocked: string[]; highestSequence: number; highestRelease: string;
}) {
  return payload.releaseId !== state.current && payload.releaseId !== state.next && !state.blocked.includes(payload.releaseId)
    && payload.sequence >= state.highestSequence
    && (payload.sequence !== state.highestSequence || !state.highestRelease || payload.releaseId === state.highestRelease);
}
