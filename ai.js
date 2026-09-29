#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Make this assistant yours: change its name, model, and coding rules here.
const ASSISTANT_NAME = "TorsAI";
const MODEL = process.env.CODING_AI_MODEL || "qwen2.5-coder:7b";
const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, a careful coding assistant owned and customized by the person running this program.
Help with programming, debugging, explaining code, and learning. Prefer correct, readable solutions.
Ask a brief clarifying question when important details are missing. Explain assumptions and point out likely edge cases.
When suggesting code changes, name the file and show a focused replacement or patch. Never claim you edited or ran code unless a tool actually did so.`;

// Bind to loopback so this app is only available on this computer.
const HOST = "YOURIPADDRESS"
const PORT = Number(process.env.PORT) || 4317;
const OLLAMA_URL = "http://YOURIPADDRESS";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error("Request is too large.");
  }
  return JSON.parse(body);
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (request.method === "GET" && url.pathname === "/api/status") {
    try {
      const result = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
      if (!result.ok) throw new Error("Ollama is not responding.");
      const data = await result.json();
      const models = (data.models || []).map((item) => item.name);
      const installed = models.some((name) => name === MODEL || name.startsWith(`${MODEL.split(":")[0]}:`));
      return sendJson(response, 200, { ollama: true, model: MODEL, installed, models });
    } catch {
      return sendJson(response, 200, { ollama: false, model: MODEL, installed: false, models: [] });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = await readJson(request);
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return sendJson(response, 400, { error: "Send a message to get started." });
      }
      const messages = body.messages
        .filter((message) => ["user", "assistant"].includes(message.role) && typeof message.content === "string")
        .slice(-40);
      const result = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          stream: false,
        }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) return sendJson(response, result.status, { error: data.error || "Ollama could not answer." });
      return sendJson(response, 200, { answer: data.message?.content || "The model returned an empty reply." });
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "Could not reach Ollama on this computer." });
    }
  }

  if (request.method === "GET" && FILES[url.pathname]) {
    const [filename, contentType] = FILES[url.pathname];
    try {
      const content = await readFile(path.join(ROOT, "public", filename));
      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      return response.end(content);
    } catch {
      return sendJson(response, 404, { error: "App file not found." });
    }
  }

  sendJson(response, 404, { error: "Not found." });
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => console.log(`Open this address in your browser: ${url}`));
  child.unref();
}

const server = createServer((request, response) => {
  handle(request, response).catch((error) => {
    if (!response.headersSent) sendJson(response, 500, { error: error.message });
    else response.destroy();
  });
});

server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `TorsAI is already running at http://${HOST}:${PORT}` : error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`${ASSISTANT_NAME} is running at ${url}`);
  console.log("This app is only available on your computer. Press Ctrl+C to stop it.");
  openBrowser(url);
});
