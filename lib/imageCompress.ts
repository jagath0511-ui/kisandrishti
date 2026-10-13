export interface CompressedImageResult {
  imageBase64: string; // Pure Base64 without data URL scheme
  previewUrl: string; // Data URL for rendering in <img>
  mimeType: string; // Always 'image/jpeg'
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Compresses an image file in the browser:
 * - Scales the image so its longest dimension is at most 1024px.
 * - Encodes as JPEG at ~0.8 quality.
 * - Uses HTML5 Canvas for fast, hardware-accelerated processing.
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1024,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('CANVAS_CONTEXT_ERROR: Could not get 2D canvas context.'));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const prefixMatch = dataUrl.match(/^data:image\/jpeg;base64,/);
      const pureBase64 = prefixMatch ? dataUrl.slice(prefixMatch[0].length) : dataUrl;

      // Calculate approximate binary byte size
      const sizeBytes = Math.ceil((pureBase64.length * 3) / 4);

      resolve({
        imageBase64: pureBase64,
        previewUrl: dataUrl,
        mimeType: 'image/jpeg',
        width,
        height,
        sizeBytes,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('IMAGE_LOAD_ERROR: Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}
