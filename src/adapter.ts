import { createServer, type IncomingMessage, type Server } from "node:http";

export interface AdapterConfig {
  // Full Gotify message endpoint, e.g. https://gotify.example.com/message
  gotifyUrl: string;
  // Gotify application token
  gotifyToken: string;
}

// Split a Slack-style alert text into a Gotify title (first line) and message (the rest)
export function parseAlert(text: string): { title: string; message: string } {
  const [first, ...rest] = text.trim().split("\n");
  return { title: first.trim(), message: rest.join("\n").trim() };
}

// Append /message to the Gotify base url unless it already points to it
export function normalizeGotifyUrl(url: string): string {
  if (url.includes("message")) return url;
  return (url.endsWith("/") ? url : url + "/") + "message";
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Send an arbitrary alert to Gotify
async function sendGotifyMessage(config: AdapterConfig, title: string, message: string): Promise<Response> {
  const body: { message: string; title?: string } = { message };
  if (title) body.title = title;

  return fetch(config.gotifyUrl, {
    method: "POST",
    headers: { "X-Gotify-Key": config.gotifyToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createAdapter(config: AdapterConfig): Server {
  return createServer(async (req, res) => {
    // Listen to POST requests on / and /message
    if (req.method !== "POST" || !["/", "/message"].includes(req.url ?? "")) {
      res.writeHead(404).end();
      return;
    }

    let text: unknown;
    try {
      text = JSON.parse(await readBody(req)).text;
    } catch {
      text = undefined;
    }
    if (typeof text !== "string") {
      console.log(">> Ignoring request without a valid Slack 'text' field\n");
      res.writeHead(400).end();
      return;
    }

    const { title, message } = parseAlert(text);
    console.log(`========== ${title} ==========`);
    console.log(message);
    console.log("=".repeat(title.length + 22));

    let resp: Response;
    try {
      resp = await sendGotifyMessage(config, title, message);
    } catch (err) {
      console.log(`>> Could not reach gotify: ${err instanceof Error ? err.message : err}\n`);
      res.writeHead(502).end();
      return;
    }

    if (resp.status === 200) {
      console.log(">> Forwarded successfully\n");
    } else if ([400, 401, 403].includes(resp.status)) {
      console.log(">> Unauthorized! GOTIFY_TOKEN is incorrect\n");
    } else {
      console.log(`>> Unknown error while forwarding to gotify. Error Code ${resp.status}\n`);
    }

    // Return the Gotify status code to TrueNAS
    res.writeHead(resp.status).end();
  });
}
