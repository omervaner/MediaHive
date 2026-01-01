// src/hooks/selection/useRubberBandSelection.js
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Rubber band (marquee) selection hook
 * Allows clicking and dragging to select multiple items
 */
export default function useRubberBandSelection({
  containerRef,    // Ref to the scrollable container
  gridRef,         // Ref to the grid element
  orderedIds,      // Array of item IDs in display order
  selection,       // Selection state object with setSelected
  enabled = true,
}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const modifiersRef = useRef({ shift: false, ctrl: false });
  const initialSelectionRef = useRef(new Set());

  // Get bounding rect relative to scroll container
  const getRelativeRect = useCallback(() => {
    if (!startPoint || !currentPoint) return null;
    
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    
    return { left, top, width, height, right: left + width, bottom: top + height };
  }, [startPoint, currentPoint]);

  // Check if a card intersects with selection rectangle
  const getIntersectingIds = useCallback(() => {
    const container = containerRef?.current;
    const grid = gridRef?.current;
    const rect = getRelativeRect();
    
    if (!container || !grid || !rect || rect.width < 5 || rect.height < 5) {
      return [];
    }

    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;

    // Convert selection rect to absolute page coordinates
    const selectionRect = {
      left: rect.left + containerRect.left,
      top: rect.top + containerRect.top - scrollTop,
      right: rect.right + containerRect.left,
      bottom: rect.bottom + containerRect.top - scrollTop,
    };

    const intersecting = [];
    const cards = grid.querySelectorAll('[data-video-id]');
    
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const videoId = card.dataset.videoId;
      
      if (!videoId) return;

      // Check intersection
      const intersects = !(
        cardRect.right < selectionRect.left ||
        cardRect.left > selectionRect.right ||
        cardRect.bottom < selectionRect.top ||
        cardRect.top > selectionRect.bottom
      );

      if (intersects) {
        intersecting.push(videoId);
      }
    });

    return intersecting;
  }, [containerRef, gridRef, getRelativeRect]);

  // Update selection during drag
  const updateSelection = useCallback(() => {
    const intersecting = getIntersectingIds();
    const { shift, ctrl } = modifiersRef.current;
    
    selection.setSelected((prev) => {
      if (shift) {
        // Shift: add to existing selection
        const next = new Set(initialSelectionRef.current);
        intersecting.forEach(id => next.add(id));
        return next;
      } else if (ctrl) {
        // Ctrl: toggle items
        const next = new Set(initialSelectionRef.current);
        intersecting.forEach(id => {
          if (initialSelectionRef.current.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        });
        return next;
      } else {
        // Normal: replace selection
        return new Set(intersecting);
      }
    });
  }, [getIntersectingIds, selection]);

  // Mouse down handler
  const handleMouseDown = useCallback((e) => {
    if (!enabled) return;
    
    // Only left mouse button
    if (e.button !== 0) return;
    
    // Don't start if clicking on a card or interactive element
    const target = e.target;
    if (target.closest('[data-video-id]') || 
        target.closest('button') || 
        target.closest('input') ||
        target.closest('.metadata-panel') ||
        target.closest('.header')) {
      return;
    }

    const container = containerRef?.current;
    if (!container) return;

    // Check if click is within the grid area
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top + container.scrollTop;

    // Store modifiers
    modifiersRef.current = {
      shift: e.shiftKey,
      ctrl: e.ctrlKey || e.metaKey,
    };

    // Store initial selection for modifier behavior
    initialSelectionRef.current = new Set(selection.selected);

    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setIsSelecting(true);

    // Clear selection on plain click (will be updated if drag happens)
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      selection.setSelected(new Set());
    }

    e.preventDefault();
  }, [enabled, containerRef, selection]);

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    if (!isSelecting) return;

    const container = containerRef?.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top + container.scrollTop;

    setCurrentPoint({ x, y });
    updateSelection();
  }, [isSelecting, containerRef, updateSelection]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      updateSelection();
      setIsSelecting(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
  }, [isSelecting, updateSelection]);

  // Attach global listeners for move/up (so drag works outside container)
  useEffect(() => {
    if (!isSelecting) return;

    const handleGlobalMove = (e) => handleMouseMove(e);
    const handleGlobalUp = () => handleMouseUp();

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // Selection rectangle style
  const selectionRect = getRelativeRect();
  const selectionStyle = isSelecting && selectionRect && selectionRect.width > 5 && selectionRect.height > 5
    ? {
        position: 'absolute',
        left: selectionRect.left,
        top: selectionRect.top,
        width: selectionRect.width,
        height: selectionRect.height,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.6)',
        pointerEvents: 'none',
        zIndex: 1000,
      }
    : null;

  return {
    isSelecting,
    handleMouseDown,
    selectionStyle,
  };
}
