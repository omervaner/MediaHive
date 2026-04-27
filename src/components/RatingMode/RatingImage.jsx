import React, { memo, useState } from "react";
import { toFileURL } from "../VideoCard/videoDom";

function buildSrc(video) {
  if (!video) return "";
  if (video.isElectronFile && video.fullPath) return toFileURL(video.fullPath);
  if (video.file) return URL.createObjectURL(video.file);
  return video.fullPath || "";
}

function Star({ index, filled, onClick }) {
  return (
    <button
      type="button"
      className={`rating-mode__star${filled ? " is-filled" : ""}`}
      onClick={() => onClick(index + 1)}
      aria-label={`Rate ${index + 1} stars`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,21.5 12,18 5.5,21.5 7,14.5 2,9.5 9,9" />
      </svg>
    </button>
  );
}

const RatingImage = memo(function RatingImage({
  video,
  onRate,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  pulseSignal,
}) {
  const [imgError, setImgError] = useState(false);
  const src = buildSrc(video);
  const ratingValue =
    typeof video?.rating === "number" && Number.isFinite(video.rating)
      ? Math.max(0, Math.min(5, Math.round(video.rating)))
      : 0;

  return (
    <div className="rating-mode__image-area">
      <button
        type="button"
        className="rating-mode__nav rating-mode__nav--prev"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous image"
      >
        ‹
      </button>

      {imgError ? (
        <div style={{ color: "rgba(255,255,255,0.5)" }}>Failed to load image</div>
      ) : (
        <img
          key={video?.id || src}
          className="rating-mode__image"
          src={src}
          alt={video?.name || ""}
          draggable={false}
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
        />
      )}

      <button
        type="button"
        className="rating-mode__nav rating-mode__nav--next"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next image"
      >
        ›
      </button>

      <div className="rating-mode__overlay">
        <div
          key={pulseSignal}
          className={`rating-mode__stars${pulseSignal ? " is-pulsing" : ""}`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              index={i}
              filled={i < ratingValue}
              onClick={onRate}
            />
          ))}
        </div>
        <div className="rating-mode__filename" title={video?.fullPath}>
          {video?.name || ""}
        </div>
      </div>
    </div>
  );
});

export default RatingImage;
