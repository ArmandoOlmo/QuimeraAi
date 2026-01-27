import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
    }
    // Listen to both breakpoints
    const mqlMobile = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`)
    const mqlTablet = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)

    mqlMobile.addEventListener("change", onChange)
    mqlTablet.addEventListener("change", onChange)
    onChange() // Initial check

    return () => {
      mqlMobile.removeEventListener("change", onChange)
      mqlTablet.removeEventListener("change", onChange)
    }
  }, [])

  return !!isTablet
}

/**
 * Returns the current viewport type: 'mobile', 'tablet', or 'desktop'
 */
export function useViewportType() {
  const [viewportType, setViewportType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setViewportType('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setViewportType('tablet')
      } else {
        setViewportType('desktop')
      }
    }

    window.addEventListener('resize', onChange)
    onChange() // Initial check

    return () => window.removeEventListener('resize', onChange)
  }, [])

  return viewportType
}
