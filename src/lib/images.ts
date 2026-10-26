/** Read local images, resize/compress them to keep storefront assets reasonably small. */
export async function imageFileToDataUrl(file: File, maxDimension = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const original = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image.')); };
    img.src = url;
  });
  const ratio = Math.min(1, maxDimension / Math.max(original.naturalWidth, original.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(original.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(original.naturalHeight * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not supported in this browser.');
  ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}
