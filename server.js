const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const ROOT = __dirname;
const PORT = 8123;
const ARCHIVE_DIRECTORIES = [
  path.join(ROOT, "archives"),
  path.join(ROOT, "archives", "pdf"),
  path.join(ROOT, "archives", "pdf", "arrivee"),
  path.join(ROOT, "archives", "pdf", "sortie"),
  path.join(ROOT, "archives", "signatures"),
  path.join(ROOT, "archives", "signatures", "arrivee"),
  path.join(ROOT, "archives", "signatures", "sortie"),
  path.join(ROOT, "archives", "metadata"),
];
const PDF_BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function safePathname(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.posix.normalize(decoded.replace(/\\/g, "/")).replace(/^(\.\.\/)+/, "");
  return normalized === "/" ? "index.html" : normalized.replace(/^\//, "") || "index.html";
}

function getRequestUrl(request) {
  return new URL(request.url || "/", `http://127.0.0.1:${PORT}`);
}

function getLocalNetworkUrls() {
  const interfaces = os.networkInterfaces();
  const urls = [];

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== "IPv4" || entry.internal) {
        return;
      }
      if (String(entry.address || "").startsWith("169.254.")) {
        return;
      }
      urls.push(`http://${entry.address}:${PORT}`);
    });
  });

  return Array.from(new Set(urls));
}

function findPdfBrowser() {
  return PDF_BROWSERS.find((browserPath) => fs.existsSync(browserPath)) || "";
}

function runPdfCommand(browserPath, sourceUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--virtual-time-budget=3500",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${outputPath}`,
      sourceUrl,
    ];

    execFile(browserPath, args, { timeout: 30000 }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function sanitizeFilePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

function getFileTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}h${minutes}`;
}

function buildPdfFileName(type, person) {
  const prefix = type === "exit" ? "document-sortie" : "document-arrivee";
  const timestamp = getFileTimestamp();
  if (!person) {
    return `${prefix}-${timestamp}.pdf`;
  }
  const lastName = sanitizeFilePart(person.nom);
  const firstName = sanitizeFilePart(person.prenom);
  return `${prefix}-${lastName}-${firstName}-${timestamp}.pdf`;
}

function getArchiveDocumentLabel(type) {
  return type === "exit" ? "SORTIE" : "ARRIVEE";
}

function getArchiveFolderName(type) {
  return type === "exit" ? "sortie" : "arrivee";
}

function normalizeStoredPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function toAbsoluteProjectPath(relativePath) {
  return path.join(ROOT, ...String(relativePath || "").split("/"));
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const subtype = String(match[1] || "png").toLowerCase();
  const extension = subtype === "jpeg" ? "jpg" : subtype;
  return {
    extension,
    buffer: Buffer.from(match[2], "base64"),
  };
}

function getSignatureRelativePath(personId, docType, signer, extension = "png") {
  return path.posix.join(
    "archives",
    "signatures",
    getArchiveFolderName(docType),
    `${sanitizeFilePart(personId || "PERSONNE")}_${sanitizeFilePart(signer || "signature")}.${sanitizeFilePart(extension || "png")}`
  );
}

function ensureSignatureEntry(person, docType, signer) {
  if (!person.signatures || typeof person.signatures !== "object") {
    person.signatures = {};
  }
  if (!person.signatures[docType] || typeof person.signatures[docType] !== "object") {
    person.signatures[docType] = {};
  }
  const currentEntry = person.signatures[docType][signer];
  if (currentEntry && typeof currentEntry === "object") {
    person.signatures[docType][signer] = {
      image: String(currentEntry.image || ""),
      validatedAt: String(currentEntry.validatedAt || ""),
    };
    return person.signatures[docType][signer];
  }

  person.signatures[docType][signer] = {
    image: String(currentEntry || ""),
    validatedAt: "",
  };
  return person.signatures[docType][signer];
}

function externalizePersonSignatures(data) {
  let changed = false;

  (data.personnes || []).forEach((person) => {
    ["arrival", "exit"].forEach((docType) => {
      ["personnel", "representant"].forEach((signer) => {
        const entry = ensureSignatureEntry(person, docType, signer);
        const imageValue = String(entry.image || "");
        const parsedImage = parseImageDataUrl(imageValue);

        if (parsedImage) {
          const relativePath = getSignatureRelativePath(person.id, docType, signer, parsedImage.extension);
          fs.writeFileSync(toAbsoluteProjectPath(relativePath), parsedImage.buffer);
          entry.image = relativePath;
          changed = true;
          return;
        }

        const normalizedPath = normalizeStoredPath(imageValue);
        if (imageValue && normalizedPath !== imageValue) {
          entry.image = normalizedPath;
          changed = true;
        }
      });
    });
  });

  return changed;
}

function normalizeArchiveFingerprint(entry) {
  const rawFingerprint = String(entry?.fingerprint || "");
  if (!rawFingerprint) {
    return false;
  }

  try {
    const payload = JSON.parse(rawFingerprint);
    if (!payload || typeof payload !== "object" || !payload.signatures || typeof payload.signatures !== "object") {
      return false;
    }

    let changed = false;
    ["personnel", "representant"].forEach((signer) => {
      const nextValue = Boolean(payload.signatures[signer]);
      if (payload.signatures[signer] !== nextValue) {
        payload.signatures[signer] = nextValue;
        changed = true;
      }
    });

    if (!changed) {
      return false;
    }

    entry.fingerprint = JSON.stringify(payload);
    return true;
  } catch (error) {
    return false;
  }
}

function normalizeArchiveFingerprints(data) {
  let changed = false;
  (data.documentsArchives || []).forEach((entry) => {
    if (normalizeArchiveFingerprint(entry)) {
      changed = true;
    }
  });
  return changed;
}

function collectSignaturePaths(data) {
  const paths = new Set();

  (data?.personnes || []).forEach((person) => {
    ["arrival", "exit"].forEach((docType) => {
      ["personnel", "representant"].forEach((signer) => {
        const entry = person?.signatures?.[docType]?.[signer];
        const imageValue =
          entry && typeof entry === "object" ? String(entry.image || "") : String(entry || "");
        const normalizedPath = normalizeStoredPath(imageValue);
        if (normalizedPath.startsWith("archives/signatures/")) {
          paths.add(normalizedPath);
        }
      });
    });
  });

  return paths;
}

function removeUnusedSignatureFiles(previousData, nextData) {
  const previousPaths = collectSignaturePaths(previousData);
  const nextPaths = collectSignaturePaths(nextData);

  previousPaths.forEach((relativePath) => {
    if (nextPaths.has(relativePath)) {
      return;
    }
    const absolutePath = toAbsoluteProjectPath(relativePath);
    const signaturesRoot = path.join(ROOT, "archives", "signatures");
    if (!absolutePath.startsWith(signaturesRoot) || !fileExists(absolutePath)) {
      return;
    }
    try {
      fs.unlinkSync(absolutePath);
    } catch (error) {
      // ignore cleanup failure
    }
  });
}

function prepareDataForPersistence(data) {
  const nextData = JSON.parse(JSON.stringify(data || {}));
  const signaturesChanged = externalizePersonSignatures(nextData);
  const fingerprintsChanged = normalizeArchiveFingerprints(nextData);
  return {
    data: nextData,
    changed: signaturesChanged || fingerprintsChanged,
  };
}

function getPersonSites(person) {
  const baseValues = Array.isArray(person?.sitesAffectation)
    ? person.sitesAffectation
    : person?.site
      ? String(person.site).split("/").map((value) => value.trim())
      : [];
  const normalized = Array.from(new Set(baseValues.map(normalizeText).filter(Boolean)));
  if (normalized.includes("TOUS SITES")) {
    return ["TOUS SITES"];
  }
  return normalized;
}

function getPersonSiteLabel(person) {
  const sites = getPersonSites(person);
  return sites.length ? sites.join(" / ") : "";
}

function isDocumentSigned(person, type) {
  const bucket = person?.signatures?.[type];
  if (!bucket || typeof bucket !== "object") {
    return false;
  }
  return Boolean(bucket.personnel?.image) && Boolean(bucket.representant?.image);
}

function buildArchiveBaseName(type, person, mode = "STANDARD") {
  const prefix = getArchiveDocumentLabel(type);
  const archiveMode = String(mode || "STANDARD").toUpperCase();
  const timestamp = getFileTimestamp();
  const personId = sanitizeFilePart(person?.id || "PERSONNE");
  const lastName = sanitizeFilePart(person?.nom || "");
  const firstName = sanitizeFilePart(person?.prenom || "");
  const modeSuffix =
    prefix === "ARRIVEE" && archiveMode === "COMPLEMENTAIRE" ? "COMPLEMENTAIRE" : "";
  return [prefix, modeSuffix, personId, lastName, firstName, timestamp].filter(Boolean).join("_");
}

function writeArchiveFiles(type, person, pdfContent, sourceUrl, mode = "STANDARD") {
  const folderName = getArchiveFolderName(type);
  const baseName = buildArchiveBaseName(type, person, mode);
  const pdfRelativePath = path.posix.join("archives", "pdf", folderName, `${baseName}.pdf`);
  const metadataRelativePath = path.posix.join("archives", "metadata", `${baseName}.json`);
  const pdfAbsolutePath = path.join(ROOT, ...pdfRelativePath.split("/"));
  const metadataAbsolutePath = path.join(ROOT, ...metadataRelativePath.split("/"));

  fs.writeFileSync(pdfAbsolutePath, pdfContent);

  const metadata = {
    personId: String(person?.id || ""),
    nom: String(person?.nom || ""),
    prenom: String(person?.prenom || ""),
    typeDocument: getArchiveDocumentLabel(type),
    sites: getPersonSiteLabel(person),
    typePersonnel: String(person?.typePersonnel || ""),
    typeContrat: String(person?.typeContrat || ""),
    documentMode: String(mode || "STANDARD").toUpperCase(),
    dateDocument: new Date().toISOString(),
    sourceUrl,
    pdfPath: pdfRelativePath,
    metadataPath: metadataRelativePath,
    signatures: person?.signatures?.[type] || {},
    representant: person?.representants?.[type] || {},
  };

  fs.writeFileSync(metadataAbsolutePath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  return {
    pdfRelativePath,
    metadataRelativePath,
  };
}

function readDataFile() {
  const dataPath = path.join(ROOT, "data.json");
  const content = fs.readFileSync(dataPath, "utf8");
  const prepared = prepareDataForPersistence(JSON.parse(content));
  if (prepared.changed) {
    fs.writeFileSync(dataPath, `${JSON.stringify(prepared.data, null, 2)}\n`, "utf8");
  }
  return prepared.data;
}

function ensureArchiveDirectories() {
  ARCHIVE_DIRECTORIES.forEach((directoryPath) => {
    fs.mkdirSync(directoryPath, { recursive: true });
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = getRequestUrl(request);
  const requestPath = safePathname(requestUrl.pathname);

  if (request.method === "GET" && requestPath === "api/data") {
    try {
      const data = readDataFile();
      return send(
        response,
        200,
        { "Content-Type": MIME_TYPES[".json"], "Cache-Control": "no-store" },
        `${JSON.stringify(data, null, 2)}\n`
      );
    } catch (error) {
      return send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Lecture impossible");
    }
  }

  if (request.method === "GET" && requestPath === "api/network-info") {
    const lanUrls = getLocalNetworkUrls();
    return send(
      response,
      200,
      { "Content-Type": MIME_TYPES[".json"], "Cache-Control": "no-store" },
      `${JSON.stringify(
        {
          localhostUrl: `http://127.0.0.1:${PORT}`,
          lanUrls,
          preferredUrl: lanUrls[0] || `http://127.0.0.1:${PORT}`,
        },
        null,
        2
      )}\n`
    );
  }

  if (request.method === "POST" && requestPath === "api/save") {
    try {
      const body = await readBody(request);
      const parsed = JSON.parse(body);
      const previousData = readDataFile();
      const prepared = prepareDataForPersistence(parsed);
      fs.writeFileSync(path.join(ROOT, "data.json"), `${JSON.stringify(prepared.data, null, 2)}\n`, "utf8");
      removeUnusedSignatureFiles(previousData, prepared.data);
      return send(response, 200, { "Content-Type": MIME_TYPES[".json"] }, JSON.stringify({ ok: true }));
    } catch (error) {
      return send(response, 500, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false }));
    }
  }

  if (request.method === "GET" && requestPath === "api/pdf") {
    const type = String(requestUrl.searchParams.get("type") || "").toLowerCase();
    const personId = String(requestUrl.searchParams.get("personId") || "");
    const shouldArchive = requestUrl.searchParams.get("archive") === "1";
    const mode = String(requestUrl.searchParams.get("mode") || "STANDARD").toUpperCase();
    const pageName = type === "exit" ? "document-sortie.html" : type === "arrival" ? "document-arrivee.html" : "";

    if (!pageName || !personId) {
      return send(response, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Parametres PDF invalides");
    }

    const browserPath = findPdfBrowser();
    if (!browserPath) {
      return send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Navigateur PDF introuvable");
    }

    try {
      const data = readDataFile();
      const person = Array.isArray(data.personnes)
        ? data.personnes.find((entry) => String(entry.id) === personId) || null
        : null;
      const outputPath = path.join(os.tmpdir(), `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
      const sourceUrl = `http://127.0.0.1:${PORT}/${pageName}?personId=${encodeURIComponent(personId)}&pdf=1&mode=${encodeURIComponent(mode)}&ts=${Date.now()}`;

      await runPdfCommand(browserPath, sourceUrl, outputPath);

      const content = fs.readFileSync(outputPath);
      let archiveInfo = null;
      if (shouldArchive && person && isDocumentSigned(person, type)) {
        archiveInfo = writeArchiveFiles(type, person, content, sourceUrl, mode);
      }
      try {
        fs.unlinkSync(outputPath);
      } catch (error) {
        // ignore
      }

      return send(
        response,
        200,
        {
          "Content-Type": MIME_TYPES[".pdf"],
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename="${buildPdfFileName(type, person)}"`,
          "X-Archive-Saved": archiveInfo ? "1" : "0",
          "X-Archive-Pdf-Path": archiveInfo?.pdfRelativePath || "",
          "X-Archive-Metadata-Path": archiveInfo?.metadataRelativePath || "",
        },
        content
      );
    } catch (error) {
      return send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Generation PDF impossible");
    }
  }

  if (request.method !== "GET") {
    return send(response, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Methode non autorisee");
  }

  const filePath = path.join(ROOT, requestPath);
  if (!filePath.startsWith(ROOT)) {
    return send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Acces refuse");
  }

  try {
    const stats = fs.statSync(filePath);
    const targetPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const extension = path.extname(targetPath).toLowerCase();
    const content = fs.readFileSync(targetPath);
    return send(
      response,
      200,
      {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
      content
    );
  } catch (error) {
    return send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Introuvable");
  }
});

ensureArchiveDirectories();

server.listen(PORT, "0.0.0.0", () => {
  const lanUrls = getLocalNetworkUrls();
  const firstLanUrl = lanUrls[0] ? ` / ${lanUrls[0]}` : "";
  console.log(`Serveur local actif sur http://127.0.0.1:${PORT}${firstLanUrl}`);
});
