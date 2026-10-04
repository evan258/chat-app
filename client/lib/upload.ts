import { authClient } from "./auth-client";

// files of messages that are uploading or failed, a failed message is retried with them
export const pendingFiles = new Map<string, File[]>();

// an optimistic message shows object urls, they are released when the message gets the real urls
export function revokePreviewUrls (urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  });
}

// xhr and not fetch, because only xhr tells how much of the file is uploaded
function putFile (url: string, file: File, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Failed to upload file"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Failed to upload file"));
    };

    xhr.send(file);
  });
}

// uploads the files to S3 and returns their ids, onProgress gets the percentage of all files together
export async function uploadFiles (files: File[], onProgress: (percent: number) => void) {
  const { data, error } = await authClient.token();
  if (error || !data?.token) throw new Error("Failed to get the token");

  const headers = {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
  };
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const prepareResponse = await fetch(`${baseUrl}/files/upload`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
    }),
  });

  if (!prepareResponse.ok) {
    throw new Error("Failed to prepare the upload");
  }

  const { files: targets }: { files: { fileId: number, putUrl: string }[] } = await prepareResponse.json();

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const loadedSizes = files.map(() => 0);

  await Promise.all(
    targets.map((target, index) =>
      putFile(target.putUrl, files[index], (loaded) => {
        loadedSizes[index] = loaded;
        const totalLoaded = loadedSizes.reduce((sum, size) => sum + size, 0);
        onProgress(Math.round((totalLoaded / totalSize) * 100));
      })
    )
  );

  const fileIds = targets.map((target) => target.fileId);

  const confirmResponse = await fetch(`${baseUrl}/files/uploaded`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileIds }),
  });

  if (!confirmResponse.ok) {
    throw new Error("Failed to confirm the upload");
  }

  return fileIds;
}
