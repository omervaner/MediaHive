import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RatingImage from "./RatingImage";
import RatingFilmstrip from "./RatingFilmstrip";
import { toFileURL } from "../VideoCard/videoDom";
import "./RatingMode.css";

const PULSE_MS = 200;
const PRELOAD_AHEAD = 3;

function getRating(video) {
  return typeof video?.rating === "number" && Number.isFinite(video.rating)
    ? Math.max(0, Math.min(5, Math.round(video.rating)))
    : 0;
}

function isUnrated(video) {
  return getRating(video) === 0;
}

export default function RatingMode({ videos, onApplyRating, onExit }) {
  const [unratedOnly, setUnratedOnly] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(() =>
    videos.findIndex(isUnrated) >= 0 ? videos.findIndex(isUnrated) : 0
  );
  const [pulseSignal, setPulseSignal] = useState(0);
  const undoStackRef = useRef([]);
  const pulseTimerRef = useRef(null);

  const totalCount = videos.length;
  const unratedCount = useMemo(
    () => videos.filter(isUnrated).length,
    [videos]
  );

  const ratedCount = totalCount - unratedCount;
  const allDone = unratedOnly && unratedCount === 0;

  const currentVideo = videos[currentIndex];

  const findNext = useCallback(
    (fromIndex) => {
      if (totalCount === 0) return -1;
      if (unratedOnly) {
        for (let i = fromIndex + 1; i < totalCount; i += 1) {
          if (isUnrated(videos[i])) return i;
        }
        for (let i = 0; i <= fromIndex; i += 1) {
          if (isUnrated(videos[i])) return i;
        }
        return -1;
      }
      return Math.min(fromIndex + 1, totalCount - 1);
    },
    [unratedOnly, videos, totalCount]
  );

  const findPrev = useCallback(
    (fromIndex) => {
      if (totalCount === 0) return -1;
      return Math.max(fromIndex - 1, 0);
    },
    [totalCount]
  );

  const advance = useCallback(() => {
    const next = findNext(currentIndex);
    if (next >= 0) setCurrentIndex(next);
  }, [findNext, currentIndex]);

  const goPrev = useCallback(() => {
    const prev = findPrev(currentIndex);
    if (prev >= 0) setCurrentIndex(prev);
  }, [findPrev, currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < totalCount - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, totalCount]);

  const triggerPulse = useCallback(() => {
    setPulseSignal((n) => n + 1);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      pulseTimerRef.current = null;
    }, PULSE_MS);
  }, []);

  const applyRating = useCallback(
    (newRating, { advanceAfter, recordUndo }) => {
      if (!currentVideo) return;
      const prevRating = getRating(currentVideo) || null;
      const targetRating = newRating === 0 ? null : newRating;
      if (recordUndo) {
        undoStackRef.current.push({
          videoId: currentVideo.id,
          index: currentIndex,
          prevRating,
        });
      }
      onApplyRating(currentVideo.file_id, targetRating);
      if (newRating > 0) triggerPulse();
      if (advanceAfter) {
        setTimeout(() => {
          const next = findNext(currentIndex);
          if (next >= 0) setCurrentIndex(next);
        }, newRating > 0 ? PULSE_MS : 0);
      }
    },
    [currentVideo, currentIndex, onApplyRating, triggerPulse, findNext]
  );

  const handleStarClick = useCallback(
    (value) => applyRating(value, { advanceAfter: true, recordUndo: true }),
    [applyRating]
  );

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    const idx = videos.findIndex((v) => v.id === entry.videoId);
    if (idx < 0) return;
    onApplyRating(videos[idx].file_id, entry.prevRating);
    setCurrentIndex(idx);
  }, [videos, onApplyRating]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onExit();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          e.preventDefault();
          applyRating(Number(e.key), { advanceAfter: true, recordUndo: true });
          break;
        case "0":
          e.preventDefault();
          applyRating(0, { advanceAfter: false, recordUndo: true });
          break;
        case "s":
        case "S":
          e.preventDefault();
          advance();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyRating, advance, goPrev, goNext, handleUndo, onExit]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (totalCount === 0) return;
    if (currentIndex >= totalCount) {
      setCurrentIndex(totalCount - 1);
    }
  }, [totalCount, currentIndex]);

  useEffect(() => {
    if (!currentVideo) return;
    const ahead = [];
    for (let i = 1; i <= PRELOAD_AHEAD; i += 1) {
      const v = videos[currentIndex + i];
      if (!v?.isElectronFile || !v?.fullPath) continue;
      const img = new Image();
      img.src = toFileURL(v.fullPath);
      ahead.push(img);
    }
    return () => {
      ahead.forEach((img) => {
        img.src = "";
      });
    };
  }, [currentVideo, currentIndex, videos]);

  const progressNumerator = unratedOnly
    ? Math.min(ratedCount, totalCount)
    : currentIndex + 1;
  const progressDenominator = totalCount;
  const progressPct =
    progressDenominator > 0
      ? Math.min(100, (progressNumerator / progressDenominator) * 100)
      : 0;
  const progressLabel = unratedOnly
    ? `${unratedCount} / ${totalCount} unrated`
    : `${currentIndex + 1} / ${totalCount}`;

  return (
    <div className="rating-mode" role="dialog" aria-label="Rating mode">
      <div className="rating-mode__topbar">
        <div className="rating-mode__progress">
          <span className="rating-mode__progress-text">{progressLabel}</span>
          <div className="rating-mode__progress-bar">
            <div
              className="rating-mode__progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="rating-mode__topbar-right">
          <button
            type="button"
            className={`rating-mode__toggle${unratedOnly ? " is-active" : ""}`}
            onClick={() => setUnratedOnly((v) => !v)}
            title="Toggle between unrated only and all images"
          >
            {unratedOnly ? "Unrated only" : "All images"}
          </button>
          <button
            type="button"
            className="rating-mode__close"
            onClick={onExit}
            aria-label="Exit rating mode"
            title="Exit (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rating-mode__empty">No images to rate.</div>
      ) : allDone ? (
        <div className="rating-mode__done">
          <div className="rating-mode__done-message">
            All done — {ratedCount} image{ratedCount === 1 ? "" : "s"} rated
          </div>
          <button
            type="button"
            className="rating-mode__done-button"
            onClick={onExit}
          >
            Back to grid
          </button>
        </div>
      ) : (
        <>
          <RatingImage
            video={currentVideo}
            onRate={handleStarClick}
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < totalCount - 1}
            pulseSignal={pulseSignal}
          />
          <RatingFilmstrip
            videos={videos}
            currentIndex={currentIndex}
            onJump={setCurrentIndex}
          />
        </>
      )}
    </div>
  );
}
