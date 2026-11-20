import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createAdapter, normalizeGotifyUrl, parseAlert } from "./adapter.ts";

function listen(server: Server): Promise<string> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)),
  );
}

describe("parseAlert", () => {
  it("uses the first line as title and the rest as message", () => {
    assert.deepEqual(parseAlert("  Title \n line one\nline two \n"), {
      title: "Title",
      message: "line one\nline two",
    });
  });

  it("handles single-line alerts", () => {
    assert.deepEqual(parseAlert("Only title"), { title: "Only title", message: "" });
  });
});

describe("normalizeGotifyUrl", () => {
  it("appends /message", () => {
    assert.equal(normalizeGotifyUrl("https://gotify.example.com"), "https://gotify.example.com/message");
    assert.equal(normalizeGotifyUrl("https://gotify.example.com/"), "https://gotify.example.com/message");
  });

  it("keeps urls already pointing to /message", () => {
    assert.equal(normalizeGotifyUrl("https://gotify.example.com/message"), "https://gotify.example.com/message");
  });
});

describe("adapter", () => {
  const received: { headers: Record<string, unknown>; body: unknown }[] = [];
  let gotifyStatus = 200;
  let gotify: Server;
  let adapter: Server;
  let adapterUrl: string;

  before(async () => {
    gotify = createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        received.push({ headers: req.headers, body: JSON.parse(data) });
        res.writeHead(gotifyStatus).end();
      });
    });
    const gotifyUrl = await listen(gotify);
    adapter = createAdapter({ gotifyUrl: normalizeGotifyUrl(gotifyUrl), gotifyToken: "secret" });
    adapterUrl = await listen(adapter);
  });

  after(() => {
    adapter.close();
    gotify.close();
  });

  const post = (path: string, body: string) =>
    fetch(adapterUrl + path, { method: "POST", headers: { "Content-Type": "application/json" }, body });

  it("forwards Slack alerts to Gotify", async () => {
    gotifyStatus = 200;
    const resp = await post("/", JSON.stringify({ text: "Pool degraded\nDisk sda failed" }));
    assert.equal(resp.status, 200);
    const last = received.at(-1)!;
    assert.equal(last.headers["x-gotify-key"], "secret");
    assert.deepEqual(last.body, { title: "Pool degraded", message: "Disk sda failed" });
  });

  it("accepts /message as well", async () => {
    const resp = await post("/message", JSON.stringify({ text: "Test" }));
    assert.equal(resp.status, 200);
  });

  it("passes the Gotify status code through", async () => {
    gotifyStatus = 401;
    const resp = await post("/", JSON.stringify({ text: "Test" }));
    assert.equal(resp.status, 401);
    gotifyStatus = 200;
  });

  it("rejects invalid payloads with 400", async () => {
    assert.equal((await post("/", "not json")).status, 400);
    assert.equal((await post("/", JSON.stringify({ foo: 1 }))).status, 400);
  });

  it("returns 404 for unknown routes and methods", async () => {
    assert.equal((await post("/other", "{}")).status, 404);
    assert.equal((await fetch(adapterUrl)).status, 404);
  });

  it("returns 502 when Gotify is unreachable", async () => {
    const unreachable = createAdapter({ gotifyUrl: "http://127.0.0.1:1/message", gotifyToken: "secret" });
    const url = await listen(unreachable);
    try {
      const resp = await fetch(url, { method: "POST", body: JSON.stringify({ text: "Test" }) });
      assert.equal(resp.status, 502);
    } finally {
      unreachable.close();
    }
  });
});
