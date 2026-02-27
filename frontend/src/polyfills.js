if (typeof URL.parse !== 'function') {
  URL.parse = function (url, base) {
    try {
      return base !== undefined ? new URL(url, base) : new URL(url)
    } catch {
      return null
    }
  }
}
