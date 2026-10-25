import crypto from "crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Bankart Payment Gateway API v3 request signature.
 * message = METHOD + "\n" + SHA512(body, hex) + "\n" + Content-Type + "\n" + Date header + "\n" + request path
 * signature = Base64(HMAC-SHA512(message, sharedSecret))
 */
function sign(method: string, path: string, body: string, contentType: string, dateHeader: string, sharedSecret: string): string {
  const bodyHash = crypto.createHash("sha512").update(body, "utf8").digest("hex");
  const message = [method, bodyHash, contentType, dateHeader, path].join("\n");
  return crypto.createHmac("sha512", sharedSecret).update(message, "utf8").digest("base64");
}

interface BankartCustomer {
  email: string;
  firstName?: string;
  lastName?: string;
  billingAddress1: string;
  billingCity: string;
  billingPostcode: string;
  billingCountry: string;
  ipAddress?: string;
}

interface CreateDebitParams {
  merchantTransactionId: string;
  amount: string; // e.g. "29.97"
  currency: string; // e.g. "BAM"
  successUrl: string;
  cancelUrl: string;
  errorUrl: string;
  callbackUrl: string;
  description?: string;
  language?: string;
  customer: BankartCustomer;
}

interface CreateDebitResult {
  redirectUrl: string;
  uuid: string | null;
  raw: unknown;
}

export async function createDebitTransaction(params: CreateDebitParams): Promise<CreateDebitResult> {
  const apiKey = requireEnv("BANKART_API_KEY");
  const apiUsername = requireEnv("BANKART_API_USERNAME");
  const apiPassword = requireEnv("BANKART_API_PASSWORD");
  const sharedSecret = requireEnv("BANKART_SHARED_SECRET");
  const apiRoot = process.env.BANKART_API_URL || "https://gateway.bankart.si/api/v3";

  const url = `${apiRoot}/transaction/${apiKey}/debit`;
  const path = new URL(url).pathname;
  const contentType = "application/json; charset=utf-8";
  const dateHeader = new Date().toUTCString();

  const body = JSON.stringify({
    merchantTransactionId: params.merchantTransactionId,
    amount: params.amount,
    currency: params.currency,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    errorUrl: params.errorUrl,
    callbackUrl: params.callbackUrl,
    description: params.description,
    language: params.language ?? "bs",
    customer: params.customer,
  });

  const signature = sign("POST", path, body, contentType, dateHeader, sharedSecret);
  const authHeader = "Basic " + Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Date": dateHeader,
      "Authorization": authHeader,
      "X-Signature": signature,
    },
    body,
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Bankart debit request failed (${res.status}): ${JSON.stringify(raw)}`);
  }

  const redirectUrl = (raw as Record<string, unknown> | null)?.redirectUrl as string | undefined;
  if (!redirectUrl) {
    throw new Error(`Bankart response missing redirectUrl: ${JSON.stringify(raw)}`);
  }

  return {
    redirectUrl,
    uuid: ((raw as Record<string, unknown>)?.uuid as string) ?? null,
    raw,
  };
}

// Bankart docs: reject callbacks whose Date header deviates too far from now (replay protection).
const MAX_CALLBACK_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Verifies an incoming Bankart callback: same HMAC scheme as requests, computed over the
 * incoming request's own values (path = our callback route path). Verified against the Sim gateway.
 */
export function verifyCallbackSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  contentType: string | null;
  dateHeader: string | null;
  path: string;
}): boolean {
  const sharedSecret = process.env.BANKART_SHARED_SECRET;
  if (!sharedSecret || !params.signatureHeader || !params.contentType || !params.dateHeader) {
    return false;
  }

  const sentAt = Date.parse(params.dateHeader);
  if (Number.isNaN(sentAt) || Math.abs(Date.now() - sentAt) > MAX_CALLBACK_CLOCK_SKEW_MS) {
    console.error("[bankart] callback rejected: Date header missing or outside allowed skew", params.dateHeader);
    return false;
  }

  const expected = Buffer.from(sign("POST", params.path, params.rawBody, params.contentType, params.dateHeader, sharedSecret));
  const received = Buffer.from(params.signatureHeader);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    console.error("[bankart] callback rejected: signature mismatch", { path: params.path });
    return false;
  }
  return true;
}
