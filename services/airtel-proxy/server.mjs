import http from "node:http";

const port = Number(process.env.PORT || 8080);
const secret = process.env.PAY_PROXY_SECRET || "";
const airtelBase = (
  process.env.AIRTEL_API_BASE || "https://openapi.airtel.africa"
).replace(/\/$/, "");

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true, service: "rfacto-airtel" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/egress") {
    if (!authorized(req)) {
      json(res, 401, { ok: false, error: "unauthorized" });
      return;
    }
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const data = await ipRes.json();
      json(res, 200, { ok: true, egress: data.ip || null });
    } catch {
      json(res, 502, { ok: false, error: "egress-lookup-failed" });
    }
    return;
  }

  if (url.pathname.startsWith("/airtel/")) {
    if (!authorized(req)) {
      json(res, 401, { ok: false, error: "unauthorized" });
      return;
    }
    const target = `${airtelBase}${url.pathname.slice("/airtel".length)}${url.search}`;
    try {
      const body = ["GET", "HEAD"].includes(req.method || "")
        ? undefined
        : await readBody(req);
      const headers = {
        accept: req.headers.accept || "application/json",
        "content-type": req.headers["content-type"] || "application/json",
        "x-country": req.headers["x-country"] || "GA",
        "x-currency": req.headers["x-currency"] || "XAF",
      };
      const airtelAuth =
        req.headers["x-airtel-authorization"] || req.headers.authorization;
      if (airtelAuth && airtelAuth !== `Bearer ${secret}`) {
        headers.authorization = airtelAuth;
      }
      const hop = await fetch(target, { method: req.method, headers, body });
      const text = await hop.text();
      res.writeHead(hop.status, {
        "content-type": hop.headers.get("content-type") || "application/json",
      });
      res.end(text);
    } catch {
      json(res, 502, { ok: false, error: "airtel-upstream-failed" });
    }
    return;
  }

  json(res, 404, { ok: false, error: "not-found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`rfacto-airtel listening on ${port}`);
});
