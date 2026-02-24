import { useState } from 'react'

/**
 * Custom hook for managing background zoom step
 * @param {number} initialStep - Initial zoom step (default: 1)
 * @returns {[number, Function]} Tuple of [zoomStep, setZoomStep]
 */
export const useBackgroundZoom = (initialStep = 1) => {
  const [bgZoomStep, setBgZoomStep] = useState(initialStep)
  return [bgZoomStep, setBgZoomStep]
}
