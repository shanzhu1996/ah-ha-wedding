// Client-side image compression for website photo uploads.
// MVP storage budget: keep compressed files under ~1MB so a 1GB free tier
// can serve ~500 couples × 4 photos. Always outputs JPEG.

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.85;
// Covers typical phone JPEGs (2–5MB) and most DSLR exports. Beyond this,
// the browser struggles to decode + canvas a single image without jank.
const INPUT_MAX_BYTES = 8 * 1024 * 1024;
const OUTPUT_MAX_BYTES = 2 * 1024 * 1024; // hard cap after compression

export class ImageUploadError extends Error {}

export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size > INPUT_MAX_BYTES) {
    throw new ImageUploadError(
      "Image is larger than 8MB — please pick a smaller one."
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("That doesn't look like an image file.");
  }

  // SVG / GIF: skip compression (canvas would drop animation / vector fidelity).
  // Rely on the input size check and hard-reject anything still too large.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    if (file.size > OUTPUT_MAX_BYTES) {
      throw new ImageUploadError(
        "This file is too large. Try a JPEG or PNG under 2MB."
      );
    }
    return file;
  }

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_WIDTH / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageUploadError("Your browser couldn't process the image.");

  // White background so transparent PNGs don't turn black when encoded to JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, JPEG_QUALITY);
  if (blob.size > OUTPUT_MAX_BYTES) {
    throw new ImageUploadError(
      "Compressed image is still too large — try a smaller photo."
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError("Couldn't read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageUploadError("Couldn't decode the image."));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new ImageUploadError("Canvas encoding failed."));
        else resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}
