import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export async function optimizeImage(inputPath, outputPath, { width, quality = 80, format = 'webp' } = {}) {
  await mkdir(dirname(outputPath), { recursive: true });
  let pipeline = sharp(inputPath);
  if (width) pipeline = pipeline.resize(width);
  pipeline = pipeline[format]({ quality });
  await pipeline.toFile(outputPath);
  return outputPath;
}

export async function screenshotToBase64(screenshotPath) {
  const buffer = await readFile(screenshotPath);
  return buffer.toString('base64');
}

export async function compareImages(pathA, pathB) {
  const [a, b] = await Promise.all([
    sharp(pathA).raw().toBuffer({ resolveWithObject: true }),
    sharp(pathB).raw().toBuffer({ resolveWithObject: true }),
  ]);

  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return 1;

  let diffPixels = 0;
  const total = a.info.width * a.info.height;
  for (let i = 0; i < a.data.length; i += a.info.channels) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (dr + dg + db > 30) diffPixels++;
  }
  return diffPixels / total;
}

export async function createThumbnail(inputPath, outputPath, size = 300) {
  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(inputPath).resize(size, size, { fit: 'cover' }).webp({ quality: 70 }).toFile(outputPath);
  return outputPath;
}
