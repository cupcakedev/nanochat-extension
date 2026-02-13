import { memo } from 'react';

interface ImagePreviewListProps {
  images: string[];
  onRemove: (index: number) => void;
}

export const ImagePreviewList = memo(({ images, onRemove }: ImagePreviewListProps) => (
  <div className="flex gap-2 px-3 pt-3 overflow-x-auto">
    {images.map((src, i) => (
      <div key={`${i}-${src.slice(0, 40)}`} className="relative shrink-0 group">
        <img
          src={src}
          alt={`Attachment ${i + 1}`}
          className="w-16 h-16 rounded-lg object-cover border border-white/10"
        />
        <button
          onClick={() => onRemove(i)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
            bg-neutral-300 text-white text-xs flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          &times;
        </button>
      </div>
    ))}
  </div>
));

ImagePreviewList.displayName = 'ImagePreviewList';
