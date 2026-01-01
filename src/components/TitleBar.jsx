import React from "react";

/**
 * TitleBar - macOS-style draggable title bar region
 * Provides space for traffic lights and window drag functionality
 */
export default function TitleBar() {
  const isMac = navigator.platform?.toLowerCase().includes("mac");
  
  // Only render on macOS
  if (!isMac) return null;

  return (
    <div className="title-bar">
      <div className="title-bar__drag-region" />
    </div>
  );
}
