import { useCallback, useState } from 'react';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;
    const blob = await response.blob();
    return fileToDataUrl(new File([blob], 'image', { type: blob.type }));
  } catch {
    return null;
  }
}

function extractImageUrl(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export function useImageAttachments() {
  const [images, setImages] = useState<string[]>([]);

  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const dataUrls = await Promise.all(imageFiles.map(fileToDataUrl));
    setImages((prev) => [...prev, ...dataUrls]);
  }, []);

  const addImageFromDrop = useCallback(async (dataTransfer: DataTransfer) => {
    const files = Array.from(dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setImages((prev) => [...prev, ...dataUrls]);
      return;
    }

    const html = dataTransfer.getData('text/html');
    const urlFromHtml = html ? extractImageUrl(html) : null;
    const plainUrl = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain');
    const candidateUrl = urlFromHtml ?? plainUrl;

    if (!candidateUrl) return;

    const dataUrl = await fetchImageAsDataUrl(candidateUrl);
    if (dataUrl) {
      setImages((prev) => [...prev, dataUrl]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return { images, addImages, addImageFromDrop, removeImage, clearImages };
}
