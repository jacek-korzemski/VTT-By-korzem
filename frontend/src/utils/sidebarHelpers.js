/**
 * Helper functions for Sidebar component
 */

/**
 * Checks if an asset is currently selected
 * @param {Object} asset - The asset to check
 * @param {string} type - The asset type ('map' or 'token')
 * @param {Object} selectedAsset - Currently selected asset
 * @param {string} selectedType - Currently selected type
 * @returns {boolean}
 */
export const isSelected = (asset, type, selectedAsset, selectedType) => {
  return selectedAsset?.id === asset.id && selectedType === type
}

/**
 * Builds the full image source path
 * @param {string} src - Relative image source path
 * @param {string} basePath - Base path for assets
 * @returns {string}
 */
export const getImageSrc = (src, basePath) => {
  return `${basePath}${src}`
}

/**
 * Handles drag start event for assets
 * @param {Object} asset - The asset being dragged
 * @param {string} type - The asset type ('map' or 'token')
 * @param {Event} e - Drag event
 */
export const handleAssetDragStart = (asset, type, e) => {
  e.dataTransfer.setData('application/json', JSON.stringify({
    id: asset.id,
    src: asset.src,
    name: asset.name,
    type,
  }))
  e.dataTransfer.effectAllowed = 'copy'
  const item = e.target.closest?.('.asset-item')
  if (e.dataTransfer.setDragImage && item) {
    const img = item.querySelector('img')
    const el = img || item
    const rect = el.getBoundingClientRect()
    e.dataTransfer.setDragImage(el, rect.width / 2, rect.height / 2)
  }
}

/**
 * Checks if a background is currently active
 * @param {Object} bg - Background to check
 * @param {Object} currentBackground - Currently active background
 * @returns {boolean}
 */
export const isCurrentBackground = (bg, currentBackground) => {
  return currentBackground?.src === bg.src
}
