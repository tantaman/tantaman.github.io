import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { ulid } from "ulid";

import {
  MAX_THOUGHT_IMAGE_BYTES,
  THOUGHT_IMAGE_MEDIA_TYPES,
  isPreviewableImage,
  type PendingThoughtImage,
} from "../lib/attachments.ts";

const MAX_THOUGHT_IMAGES = 100;

export interface ThoughtImageController {
  images: readonly PendingThoughtImage[];
  error: string | null;
  addFiles: (files: FileList | readonly File[]) => void;
  remove: (id: string) => void;
  reset: () => void;
}

export function useThoughtImages(): ThoughtImageController {
  const [images, setImages] = useState<PendingThoughtImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => () => {
    for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl);
  }, []);

  function addFiles(files: FileList | readonly File[]) {
    const candidates = Array.from(files);
    const accepted: PendingThoughtImage[] = [];
    let nextError: string | null = null;
    for (const file of candidates) {
      if (!isPreviewableImage(file.type)) {
        nextError = `${file.name || "That file"} is not a supported image.`;
        continue;
      }
      if (file.size > MAX_THOUGHT_IMAGE_BYTES) {
        nextError = `${file.name} is larger than 15 MB.`;
        continue;
      }
      accepted.push({
        id: ulid(),
        file,
        previewUrl: URL.createObjectURL(file),
        createdAt: Date.now(),
      });
    }
    const remaining = Math.max(0, MAX_THOUGHT_IMAGES - imagesRef.current.length);
    const added = accepted.slice(0, remaining);
    for (const image of accepted.slice(remaining)) URL.revokeObjectURL(image.previewUrl);
    if (added.length < accepted.length) nextError = `A thought can have up to ${MAX_THOUGHT_IMAGES} images.`;
    setImages((current) => [...current, ...added]);
    setError(nextError);
  }

  function remove(id: string) {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((image) => image.id !== id);
    });
    setError(null);
  }

  function reset() {
    for (const image of imagesRef.current) URL.revokeObjectURL(image.previewUrl);
    setImages([]);
    setError(null);
  }

  return { images, error, addFiles, remove, reset };
}

export function ThoughtImageDropzone({
  controller,
  children,
  compact = false,
}: {
  controller: ThoughtImageController;
  children: ReactNode;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) controller.addFiles(event.dataTransfer.files);
  }

  return (
    <div
      className={`thought-image-dropzone${dragging ? " is-dragging" : ""}${compact ? " is-compact" : ""}`}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.stopPropagation();
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDragging(false);
      }}
      onDrop={drop}
    >
      {children}
      {controller.images.length > 0 ? (
        <div className="thought-image-staging" aria-label="Images to attach">
          {controller.images.map((image) => (
            <figure key={image.id}>
              <img src={image.previewUrl} alt={image.file.name} />
              <button
                type="button"
                onClick={() => controller.remove(image.id)}
                aria-label={`Remove ${image.file.name}`}
                title={`Remove ${image.file.name}`}
              >×</button>
              <figcaption>{image.file.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      <div className="thought-image-prompt">
        <button type="button" onClick={() => inputRef.current?.click()}>Add images</button>
        <span>or drop them here</span>
        <input
          ref={inputRef}
          type="file"
          accept={THOUGHT_IMAGE_MEDIA_TYPES.join(",")}
          multiple
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files) controller.addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {dragging ? <div className="thought-image-drop-overlay">Drop images to attach</div> : null}
    </div>
  );
}
