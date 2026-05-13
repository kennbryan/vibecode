"use client";

import imageCompression from "browser-image-compression";

const TARGET_KB = 300;

export async function compressReportPhoto(file: File) {
  return imageCompression(file, {
    maxSizeMB: TARGET_KB / 1024,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.78,
  });
}
