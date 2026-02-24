/**
 * Helper functions for path manipulation
 */

/**
 * Splits a path into segments
 * @param {string} path - Path string
 * @returns {string[]}
 */
export const getPathSegments = (path) => {
  return (path || '').split('/').filter(Boolean)
}

/**
 * Gets the parent path from a given path
 * @param {string} path - Path string
 * @returns {string}
 */
export const getParentPath = (path) => {
  const segments = getPathSegments(path)
  return segments.slice(0, -1).join('/')
}
