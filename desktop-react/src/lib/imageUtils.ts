/**
 * Utility functions for loading, resizing and optimizing images directly in the browser
 */

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}

/**
 * Resizes an image file to max dimensions and converts it to a clean, compact Data URL.
 * Preserves transparency when format is 'image/png' or 'image/webp'.
 */
export async function fileToOptimizedDataUrl(
  file: File,
  maxDimension = 512,
  quality = 0.85,
  preferPng = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a GIF or SVG, resizing on canvas may lose animation/vector crispness, so read directly
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if 2d context unavailable
          resolve(reader.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = preferPng || file.type === 'image/png' || file.type === 'image/webp';
        try {
          if (isPng) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } else {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          }
        } catch {
          resolve(reader.result as string);
        }
      };

      img.onerror = () => reject(new Error('Не удалось декодировать изображение'));
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
