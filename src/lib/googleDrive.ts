/**
 * Google Drive API Service
 */

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_URL = "https://www.googleapis.com/upload/drive/v3";

export async function uploadToGoogleDrive(
  token: string,
  fileName: string,
  base64Data: string,
  folderName: string = "2S AUTO - Archives"
) {
  try {
    // 1. Find or create the folder
    let folderId = await findFolder(token, folderName);
    if (!folderId) {
      folderId = await createFolder(token, folderName);
    }

    // 2. Prepare the file metadata
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: "image/jpeg"
    };

    // 3. Convert base64 to Blob
    const base64Content = base64Data.split(",")[1];
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    // 4. Upload the file (Multipart upload)
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", blob);

    const response = await fetch(`${UPLOAD_API_URL}/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to upload to Google Drive");
    }

    return await response.json();
  } catch (error) {
    console.error("Google Drive upload error:", error);
    throw error;
  }
}

async function findFolder(token: string, name: string): Promise<string | null> {
  const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const response = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function createFolder(token: string, name: string): Promise<string> {
  const response = await fetch(`${DRIVE_API_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  const data = await response.json();
  return data.id;
}
