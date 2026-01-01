// src/components/VideoCard/ImageElement.jsx
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { toFileURL } from "./videoDom";

/**
 * Simple image element component for displaying images in the media grid.
 * Unlike videos, images don't need play/pause orchestration.
 */
const ImageElement = memo(function ImageElement({
  video, // media object (named 'video' for compatibility)
  onLoad,
  onError,
  containerRef,
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Build image source URL
  const src = (() => {
    if (video.isElectronFile && video.fullPath) {
      return toFileURL(video.fullPath);
    }
    if (video.file) {
      return URL.createObjectURL(video.file);
    }
    return video.fullPath || "";
  })();

  const handleLoad = useCallback((e) => {
    setLoaded(true);
    setError(null);
    const img = e.target;
    const aspectRatio = img.naturalWidth && img.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : 1;
    onLoad?.(aspectRatio);
  }, [onLoad]);

  const handleError = useCallback((e) => {
    setError("Failed to load image");
    onError?.(e);
  }, [onError]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (video.file && src.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(src);
        } catch {}
      }
    };
  }, [src, video.file]);

  if (error) {
    return (
      <div className="error-indicator" role="alert">
        <div className="error-indicator__icon" aria-hidden="true" />
        <div className="error-indicator__message">{error}</div>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={video.name}
      onLoad={handleLoad}
      onError={handleError}
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: loaded ? "block" : "none",
      }}
    />
  );
});

export default ImageElement;
