const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);

const apiHandlers = {
  "/api/site-state": require("./api/site-state"),
  "/api/site-media": require("./api/site-media"),
  "/api/media": require("./api/media"),
  "/api/media-file": require("./api/media-file"),
};

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const PAGE_ROUTES = {
  "/": "index.html",
  "/admin": "admin.html",
  "/about": "about.html",
  "/contact": "contact.html",
  "/work": "work.html",
  "/work-detail": "work-detail.html",
};

function enhanceResponse(response) {
  response.status = function status(code) {
    response.statusCode = code;
    return response;
  };
  return response;
}

function safeJoin(root, targetPath) {
  const resolved = path.normalize(path.join(root, targetPath));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

async function readJsonBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function serveApi(request, response, url) {
  const handler = apiHandlers[url.pathname];
  if (!handler) return false;

  request.query = Object.fromEntries(url.searchParams.entries());
  request.body = await readJsonBody(request);
  enhanceResponse(response);
  await handler(request, response);
  return true;
}

function serveFile(filePath, response) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = STATIC_TYPES[ext] || "application/octet-stream";
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=86400");
  fs.createReadStream(filePath).pipe(response);
}

function resolveStaticPath(urlPath) {
  if (PAGE_ROUTES[urlPath]) {
    return safeJoin(ROOT, PAGE_ROUTES[urlPath]);
  }

  const directPath = urlPath === "/" ? "/index.html" : urlPath;
  return safeJoin(ROOT, directPath.replace(/^\/+/, ""));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(
        JSON.stringify({
          ok: true,
          service: "ty",
          time: new Date().toISOString(),
        })
      );
      return;
    }

    if (await serveApi(request, response, url)) return;

    const filePath = resolveStaticPath(url.pathname);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(filePath, response);
      return;
    }

    const fallbackPath = safeJoin(ROOT, "404.html");
    response.statusCode = 404;
    if (fallbackPath && fs.existsSync(fallbackPath)) {
      serveFile(fallbackPath, response);
      return;
    }
    response.end("Not found");
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(`Server error: ${error.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`TY server listening on ${PORT}`);
});
