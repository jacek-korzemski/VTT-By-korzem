import { useRef, useEffect } from 'react'

/**
 * Custom hook to scroll to a section when loading completes
 * @param {boolean} isLoading - Loading state
 * @param {Object} navigationForwardRef - Ref object that triggers navigation
 * @returns {Object} Ref to attach to the section element
 */
export const useScrollToSection = (isLoading, navigationForwardRef) => {
  const sectionRef = useRef(null)
  const prevLoading = useRef(false)

  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      if (navigationForwardRef?.current) {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        navigationForwardRef.current = false
      }
    }
    prevLoading.current = isLoading
  }, [isLoading, navigationForwardRef])

  return sectionRef
}
