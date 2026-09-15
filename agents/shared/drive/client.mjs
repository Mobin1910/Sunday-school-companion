import { config } from "../config.mjs";

/**
 * The little of the Drive API these agents need.
 *
 * Plain `fetch` against the REST endpoints rather than the `googleapis`
 * package: this uses four calls — list, get, download, upload — and a
 * dependency tree of a hundred packages to make four calls is a hundred
 * packages that can break a content pipeline on a Sunday afternoon.
 *
 * Authentication is an OAuth **refresh token** for the teacher's own account.
 * Not a service account: the curriculum lives in somebody's personal Drive,
 * and a service account would need every folder shared with it by hand before
 * it could read anything. The refresh token is exchanged for a short-lived
 * access token at the start of a run and held in memory only.
 *
 * Nothing here writes to a source folder. The only call that creates anything
 * is `upload`, and the agent only ever points it at `06 - Memory Verse`.
 */

const FOLDER = "application/vnd.google-apps.folder";

let cachedToken = null;

export async function accessToken() {
  if (cachedToken && cachedToken.until > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret, refreshToken } = config.google;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new DriveAuthError(
      "Google Drive credentials are not set.\n" +
        "  Add to .env.local (git-ignored):\n" +
        "    GOOGLE_OAUTH_CLIENT_ID=...\n" +
        "    GOOGLE_OAUTH_CLIENT_SECRET=...\n" +
        "    GOOGLE_OAUTH_REFRESH_TOKEN=...\n" +
        "  See agents/README.md for how to obtain them, or use --source-dir\n" +
        "  to run against a local folder of curriculum files instead.",
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new DriveAuthError(
      `Could not refresh the Google token (${response.status}). ` +
        "The refresh token may have been revoked; re-authorise and update .env.local.",
    );
  }

  const body = await response.json();
  cachedToken = {
    value: body.access_token,
    until: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export class DriveAuthError extends Error {}
export class DriveError extends Error {}

async function api(path, params = {}) {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${await accessToken()}` },
  });

  if (!response.ok) {
    throw new DriveError(`Drive ${path} failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

const quote = (name) => name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/** Everything directly inside a folder. Trashed items are never returned. */
export async function children(parentId, { foldersOnly = false } = {}) {
  const out = [];
  let pageToken;

  do {
    const page = await api("files", {
      q:
        `'${parentId}' in parents and trashed = false` +
        (foldersOnly ? ` and mimeType = '${FOLDER}'` : ""),
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, md5Checksum)",
      pageSize: 200,
      orderBy: "name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });
    out.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return out;
}

/** One child by exact name, or undefined. */
export async function childNamed(parentId, name) {
  const page = await api("files", {
    q: `'${parentId}' in parents and name = '${quote(name)}' and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 2,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (page.files ?? [])[0];
}

/** The library root, by id when configured and by name otherwise. */
export async function libraryRoot(name = "Sunday School Companion") {
  if (config.driveRoot) return { id: config.driveRoot, name };

  const page = await api("files", {
    q: `name = '${quote(name)}' and mimeType = '${FOLDER}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 5,
  });

  const found = page.files ?? [];
  if (found.length === 0) {
    throw new DriveError(
      `No Drive folder named "${name}". Set DRIVE_LIBRARY_ROOT_ID in .env.local.`,
    );
  }
  if (found.length > 1) {
    throw new DriveError(
      `More than one Drive folder is named "${name}". ` +
        "Set DRIVE_LIBRARY_ROOT_ID in .env.local to say which one is the library.",
    );
  }
  return found[0];
}

/** A file's bytes. Read-only: this never touches the file it downloads. */
export async function download(fileId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${await accessToken()}` } },
  );
  if (!response.ok) {
    throw new DriveError(`Could not download ${fileId} (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Put a file into a folder. The only call in this module that writes.
 *
 * Creates a new file every time rather than overwriting: a draft is a dated
 * artefact and a teacher who opens yesterday's should still find yesterday's.
 */
export async function upload({ parentId, name, mimeType, body }) {
  const boundary = `ssc${Date.now().toString(36)}`;
  const metadata = JSON.stringify({ name, parents: [parentId] });

  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n`,
    ),
    Buffer.isBuffer(body) ? body : Buffer.from(body),
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body: payload,
    },
  );

  if (!response.ok) {
    throw new DriveError(`Upload of "${name}" failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}
