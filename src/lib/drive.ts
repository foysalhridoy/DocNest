import { google } from "googleapis";
import { DRIVE_CONFIGS, DRIVE_SWITCH_THRESHOLD_PERCENT } from "./config";
import { DriveSlotInfo } from "@/types";

/**
 * Normalizes private key strings from environment variables,
 * converting escaped literal `\n` to real newlines and removing wrapping quotes.
 */
function cleanPrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

/**
 * Returns configuration values for a specific drive slot.
 */
export function getDriveSlotConfig(slot: 1 | 2) {
  const config = DRIVE_CONFIGS.find((c) => c.slot === slot);
  if (!config) {
    throw new Error(`Drive slot ${slot} not defined in configuration`);
  }

  const clientEmail = process.env[config.emailEnvKey];
  const privateKey = cleanPrivateKey(process.env[config.privateKeyEnvKey]);
  const folderId = process.env[config.folderIdEnvKey];

  const isConfigured = Boolean(clientEmail && privateKey && folderId);

  return {
    ...config,
    clientEmail,
    privateKey,
    folderId,
    isConfigured,
  };
}

/**
 * Instantiates an authenticated Google Drive client for a specific slot.
 */
export function getDriveClient(slot: 1 | 2) {
  const config = getDriveSlotConfig(slot);

  if (!config.isConfigured || !config.clientEmail || !config.privateKey) {
    throw new Error(
      `Drive Slot ${slot} credentials are not configured. Check ${config.emailEnvKey} and ${config.privateKeyEnvKey}.`
    );
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    auth,
    folderId: config.folderId!,
  };
}

/**
 * Inspects a drive slot's storage quota via about.get.
 */
export async function getSlotStorageQuota(slot: 1 | 2): Promise<{
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
  configured: boolean;
}> {
  try {
    const config = getDriveSlotConfig(slot);
    if (!config.isConfigured) {
      return { usedBytes: 0, totalBytes: 0, usagePercent: 0, configured: false };
    }

    const { drive } = getDriveClient(slot);
    const res = await drive.about.get({
      fields: "storageQuota,user",
    });

    const quota = res.data.storageQuota;
    const usage = quota?.usage ? parseInt(quota.usage, 10) : 0;
    const limit = quota?.limit ? parseInt(quota.limit, 10) : 0;

    // Default to 15 GB (free Google account quota) if limit is undefined/unlimited
    const totalBytes = limit > 0 ? limit : 15 * 1024 * 1024 * 1024;
    const usagePercent = totalBytes > 0 ? Math.min(100, (usage / totalBytes) * 100) : 0;

    return {
      usedBytes: usage,
      totalBytes,
      usagePercent: Math.round(usagePercent * 10) / 10,
      configured: true,
    };
  } catch (err) {
    console.warn(`[DocNest] Warning: Could not fetch quota for Drive slot ${slot}:`, err);
    return {
      usedBytes: 0,
      totalBytes: 15 * 1024 * 1024 * 1024,
      usagePercent: 0,
      configured: false,
    };
  }
}

/**
 * Returns overall storage health and usage for all configured Drive slots.
 */
export async function getDriveStorageStats(): Promise<DriveSlotInfo[]> {
  const stats: DriveSlotInfo[] = [];

  for (const config of DRIVE_CONFIGS) {
    const slotConfig = getDriveSlotConfig(config.slot);
    const quota = await getSlotStorageQuota(config.slot);

    let status: "active" | "standby" | "full" | "unconfigured" = "unconfigured";
    if (slotConfig.isConfigured) {
      if (quota.usagePercent >= DRIVE_SWITCH_THRESHOLD_PERCENT) {
        status = "full";
      } else {
        status = config.slot === 1 ? "active" : "standby";
      }
    }

    stats.push({
      slot: config.slot,
      name: config.name,
      email: slotConfig.clientEmail || "Not configured",
      folderId: slotConfig.folderId || "Not configured",
      usedBytes: quota.usedBytes,
      totalBytes: quota.totalBytes,
      usagePercent: quota.usagePercent,
      status,
      configured: slotConfig.isConfigured,
    });
  }

  // Adjust active status: if slot 1 is full or unconfigured and slot 2 is configured, slot 2 becomes active
  if (stats[0] && (stats[0].status === "full" || !stats[0].configured) && stats[1]?.configured) {
    if (stats[1].status !== "full") {
      stats[1].status = "active";
    }
  }

  return stats;
}

/**
 * Determines which drive slot to use for a new upload based on quota usage.
 * Defaults to Slot 1, switches to Slot 2 when Slot 1 reaches 90% or is unconfigured.
 */
export async function getTargetDriveSlot(): Promise<1 | 2> {
  const slot1Config = getDriveSlotConfig(1);
  const slot2Config = getDriveSlotConfig(2);

  if (!slot1Config.isConfigured && slot2Config.isConfigured) {
    return 2;
  }

  if (slot1Config.isConfigured) {
    const quota1 = await getSlotStorageQuota(1);
    if (quota1.usagePercent >= DRIVE_SWITCH_THRESHOLD_PERCENT && slot2Config.isConfigured) {
      console.log(
        `[DocNest] Drive 1 is at ${quota1.usagePercent}% capacity. Switching upload to Drive 2.`
      );
      return 2;
    }
    return 1;
  }

  // Default fallback
  return 1;
}

/**
 * Creates a resumable upload session on Google Drive.
 * The browser can upload directly to the returned URI to bypass Vercel serverless request body limits.
 */
export async function createResumableUploadSession(params: {
  title: string;
  mimeType: string;
  sizeBytes: number;
  slot?: 1 | 2;
}): Promise<{ uploadUrl: string; driveSlot: 1 | 2; folderId: string }> {
  const slot = params.slot ?? (await getTargetDriveSlot());
  const { auth, folderId } = getDriveClient(slot);

  const tokenRes = await auth.getAccessToken();
  const accessToken = tokenRes.token;

  if (!accessToken) {
    throw new Error(`Failed to obtain access token for Drive Slot ${slot}`);
  }

  const metadata = {
    name: params.title,
    parents: [folderId],
    mimeType: params.mimeType,
  };

  // Google Drive Resumable upload initiation endpoint
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.mimeType,
        "X-Upload-Content-Length": params.sizeBytes.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(
      `Drive resumable session initiation failed (${initResponse.status}): ${errorText}`
    );
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive did not return a resumable session URI location header");
  }

  return {
    uploadUrl,
    driveSlot: slot,
    folderId,
  };
}

/**
 * Grants public read-only permission ("anyone with the link can view") to a file.
 */
export async function makeFilePublic(slot: 1 | 2, fileId: string): Promise<void> {
  const { drive } = getDriveClient(slot);
  try {
    // Check if anyone permission already exists
    const listRes = await drive.permissions.list({
      fileId,
      supportsAllDrives: true,
      fields: "permissions(id, type, role)",
    });
    const exists = listRes.data.permissions?.some((p) => p.type === "anyone");
    if (exists) return;

    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: number; status?: number; message?: string };
    if (errorObj?.code === 409 || errorObj?.status === 409) return;
    throw err;
  }
}

/**
 * Removes "anyone with the link can view" permission from a Google Drive file,
 * making it strictly private to the service account.
 */
export async function makeFilePrivate(slot: 1 | 2, fileId: string): Promise<void> {
  const { drive } = getDriveClient(slot);
  try {
    const listRes = await drive.permissions.list({
      fileId,
      supportsAllDrives: true,
      fields: "permissions(id, type, role)",
    });

    const permissions = listRes.data.permissions || [];
    for (const perm of permissions) {
      if (perm.type === "anyone" && perm.id) {
        await drive.permissions.delete({
          fileId,
          permissionId: perm.id,
          supportsAllDrives: true,
        });
      }
    }
  } catch (err: unknown) {
    const errorObj = err as { code?: number; status?: number };
    // If permission doesn't exist or file already private, ignore 404
    if (errorObj?.code === 404 || errorObj?.status === 404) return;
    throw err;
  }
}

/**
 * Applies Drive permission changes in batches with retry and exponential backoff.
 */
export async function batchUpdateDrivePrivacy(
  files: Array<{ drive_slot: 1 | 2; drive_file_id: string }>,
  isPrivate: boolean,
  batchSize = 5
): Promise<{ successCount: number; errors: Array<{ fileId: string; error: string }> }> {
  let successCount = 0;
  const errors: Array<{ fileId: string; error: string }> = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (f) => {
        // Skip mock files
        if (f.drive_file_id.startsWith("mock_")) {
          successCount++;
          return;
        }

        const slotConfig = getDriveSlotConfig(f.drive_slot);
        if (!slotConfig.isConfigured) {
          successCount++;
          return;
        }

        let retries = 3;
        let delay = 500;
        while (retries > 0) {
          try {
            if (isPrivate) {
              await makeFilePrivate(f.drive_slot, f.drive_file_id);
            } else {
              await makeFilePublic(f.drive_slot, f.drive_file_id);
            }
            successCount++;
            return;
          } catch (err: unknown) {
            retries--;
            if (retries === 0) {
              const msg = err instanceof Error ? err.message : String(err);
              errors.push({ fileId: f.drive_file_id, error: msg });
              console.warn(`[DocNest] Failed to update privacy for file ${f.drive_file_id}:`, msg);
            } else {
              await new Promise((res) => setTimeout(res, delay));
              delay *= 2;
            }
          }
        }
      })
    );
  }

  return { successCount, errors };
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteDriveFile(slot: 1 | 2, fileId: string): Promise<void> {
  const { drive } = getDriveClient(slot);
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

/**
 * Updates a file's title in Google Drive.
 */
export async function renameDriveFile(slot: 1 | 2, fileId: string, newTitle: string): Promise<void> {
  const { drive } = getDriveClient(slot);
  await drive.files.update({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      name: newTitle,
    },
  });
}

/**
 * Obtains a media download stream for proxying a file download.
 */
export async function getDriveFileMediaStream(slot: 1 | 2, fileId: string) {
  const { drive } = getDriveClient(slot);
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    { responseType: "stream" }
  );

  return response.data;
}

/**
 * Streams a Google Drive file with support for HTTP Range requests,
 * allowing PDF and video streaming/previews to work seamlessly for authenticated admin requests.
 */
export async function getDriveFileRangeStream(
  slot: 1 | 2,
  fileId: string,
  rangeHeader?: string | null
) {
  const { drive } = getDriveClient(slot);

  const requestHeaders: Record<string, string> = {};
  if (rangeHeader) {
    requestHeaders["Range"] = rangeHeader;
  }

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "stream",
      headers: requestHeaders,
    }
  );

  const resHeaders = response.headers as Record<string, string | number | undefined>;
  const headers: Record<string, string> = {};

  if (resHeaders["content-length"]) {
    headers["content-length"] = String(resHeaders["content-length"]);
  }
  if (resHeaders["content-range"]) {
    headers["content-range"] = String(resHeaders["content-range"]);
  }
  if (resHeaders["content-type"]) {
    headers["content-type"] = String(resHeaders["content-type"]);
  }
  headers["accept-ranges"] = "bytes";

  return {
    stream: response.data as NodeJS.ReadableStream,
    headers,
    status: response.status || 200,
  };
}
