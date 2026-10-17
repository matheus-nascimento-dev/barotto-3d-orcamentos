import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.dirname(fileURLToPath(import.meta.url));
const files = new Set([
  "index.html",
  "app.js",
  "core.js",
  "proposal.js",
  "styles.css",
  "favicon.svg",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const name = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!files.has(name)) {
    res.writeHead(404);
    res.end("Não encontrado");
    return;
  }
  try {
    const content = await readFile(path.join(root, name));
    res.writeHead(200, {
      "Content-Type": types[path.extname(name)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end("Arquivo indisponível");
  }
});
const port = Number(process.env.PORT) || 4173;
server.listen(port, "127.0.0.1", () =>
  console.log(`Barotto 3D funcionando em http://localhost:${port}`),
);
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `A porta ${port} está ocupada. Defina PORT para usar outra porta.`
      : error.message,
  );
  process.exit(1);
});
