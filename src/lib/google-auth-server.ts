import { OAuth2Client } from "google-auth-library";

export type GoogleProfile = {
  email: string;
  name: string;
  sub: string;
  picture?: string;
};

/** Resolve a Google profile from an OAuth access token via the userinfo endpoint. */
async function profileFromAccessToken(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("userinfo_failed");
  const data = (await res.json()) as {
    email?: string;
    name?: string;
    sub?: string;
    picture?: string;
  };
  if (!data.email) throw new Error("no_email");
  return {
    email: data.email,
    name: data.name ?? data.email.split("@")[0],
    sub: data.sub ?? data.email,
    picture: data.picture,
  };
}

/** Resolve a Google profile from a signed ID-token credential (verified against the client id). */
async function profileFromCredential(
  credential: string,
  clientId: string
): Promise<GoogleProfile> {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("no_email");
  return {
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    sub: payload.sub ?? "",
    picture: payload.picture,
  };
}

/**
 * Server-side verification of a Google sign-in. Returns a trusted profile from
 * an access token or an ID-token credential — never trust client-supplied email
 * directly. Throws on any failure (missing config, invalid token, no email).
 */
export async function verifyGoogleProfile(input: {
  accessToken?: string;
  credential?: string;
}): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("google_not_configured");
  if (input.accessToken) return profileFromAccessToken(input.accessToken);
  if (input.credential) return profileFromCredential(input.credential, clientId);
  throw new Error("missing_google_credential");
}
