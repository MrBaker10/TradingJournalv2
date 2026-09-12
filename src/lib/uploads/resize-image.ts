const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Browser-only (Canvas). Always re-encodes to JPEG regardless of the source
// format, so trade_screenshots stays at exactly the columns drafted in
// project-overview.md — no content-type column, the upload route always
// serves image/jpeg. Not unit-testable: this project's Vitest environment is
// "node" (vitest.config.mts) and has no Canvas — verified in the browser
// click path instead, like the rest of the UI layer.
export async function resizeAndCompressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to compress image"));
        }
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
