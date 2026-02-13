import { useCallback, useState } from 'react';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function useImageAttachments() {
  const [images, setImages] = useState<string[]>([]);

  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const dataUrls = await Promise.all(imageFiles.map(fileToDataUrl));
    setImages((prev) => [...prev, ...dataUrls]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return { images, addImages, removeImage, clearImages };
}
