import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const outputPdf = join(root, "apresentacao-universo-sl-completa.pdf");
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const executablePath = chromePaths.find((path) => existsSync(path));
if (!executablePath) {
  throw new Error("Chrome ou Edge nao encontrado para gerar o PDF.");
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const filePath = join(root, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/index.html?export=pdf`;

await new Promise((resolve, reject) => {
  const child = spawn(
    executablePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--print-to-pdf=${outputPdf}`,
      "--no-pdf-header-footer",
      url,
    ],
    { stdio: "inherit" }
  );

  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`Falha ao gerar PDF (codigo ${code}).`));
  });
});

server.close();
console.log(`PDF gerado em: ${outputPdf}`);
