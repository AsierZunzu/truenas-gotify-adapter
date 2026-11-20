import pkg from "../package.json" with { type: "json" };
import { createAdapter, normalizeGotifyUrl } from "./adapter.ts";

// The ip address the service should listen on
// Defaults to localhost for security reasons
const LISTEN_HOST = process.env.LISTEN_HOST ?? "127.0.0.1";
const PORT = 31662;

// Control whether the validity of the ssl certificate
// of the gotify server should be checked.
// Useful for allowing self signed certificates
//
// SECURITY: Disabling verification of the certificate is highly
// insecure as it allows for mitm attacks to intercept messages
// and even the secret Gotify Token
const VERIFY_CERT = !["false", "no", "n"].includes((process.env.VERIFY_CERT ?? "true").toLowerCase());

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// The url the alerts should be forwarded to.
// Format: http[s]://{host}:{port}/
const gotifyUrl = process.env.GOTIFY_URL || fail("Set Gotify Endpoint via 'GOTIFY_URL=http[s]://{host}:{port}/'!");
// The token for the gotify application
// Example: cGVla2Fib29v
const gotifyToken = process.env.GOTIFY_TOKEN || fail("Set Gotify App Token via 'GOTIFY_TOKEN={token}'!");

if (!VERIFY_CERT) {
  // Gotify is the only outbound TLS destination of this process,
  // so disabling verification process-wide is equivalent
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.log("WARNING: Running without certificate validation of the gotify endpoint");
}

const server = createAdapter({ gotifyUrl: normalizeGotifyUrl(gotifyUrl), gotifyToken });
server.listen(PORT, LISTEN_HOST, () =>
  console.log(`${pkg.name} v${pkg.version} listening on http://${LISTEN_HOST}:${PORT}`),
);

// Exit promptly on `docker stop`
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
