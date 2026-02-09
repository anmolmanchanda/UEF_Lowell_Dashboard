import { put } from "@vercel/blob";

export async function putJson(path: string, payload: unknown) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const blob = await put(path, JSON.stringify(payload, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json"
  });
  return blob.url;
}
