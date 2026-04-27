import React, { memo, useEffect, useRef } from "react";
import { toFileURL } from "../VideoCard/videoDom";

function thumbSrc(video) {
  if (!video) return "";
  if (video.isElectronFile && video.fullPath) return toFileURL(video.fullPath);
  if (video.file) return URL.createObjectURL(video.file);
  return video.fullPath || "";
}

const RatingFilmstrip = memo(function RatingFilmstrip({
  videos,
  currentIndex,
  onJump,
}) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    const item = itemRefs.current[currentIndex];
    if (!container || !item) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const target =
      item.offsetLeft - container.clientWidth / 2 + item.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    void containerRect;
    void itemRect;
  }, [currentIndex]);

  return (
    <div ref={containerRef} className="rating-mode__filmstrip">
      {videos.map((video, idx) => {
        const rating =
          typeof video?.rating === "number" && Number.isFinite(video.rating)
            ? Math.max(0, Math.min(5, Math.round(video.rating)))
            : 0;
        const isRated = rating > 0;
        const isCurrent = idx === currentIndex;
        const cls = [
          "rating-mode__thumb",
          isCurrent ? "is-current" : "",
          isRated ? "is-rated" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={video.id}
            ref={(el) => (itemRefs.current[idx] = el)}
            type="button"
            className={cls}
            onClick={() => onJump(idx)}
            title={video.name}
          >
            <img src={thumbSrc(video)} alt="" loading="lazy" draggable={false} />
            {isRated && (
              <span className="rating-mode__thumb-badge">★{rating}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default RatingFilmstrip;
