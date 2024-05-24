export function getTarget() {
  return window.location.pathname.split('/').slice(1, 3)
}

export function getFilter(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('ignoredFiles').then((ignoredFiles) => {
      if (Array.isArray(ignoredFiles.ignoredFiles)) {
        let filter = '?filter='

        ignoredFiles.ignoredFiles.forEach((ignored) => {
          filter += '%21' + ignored + '%24%2C' // !md$,
        })

        resolve(filter.substring(0, filter.length - 3))
      }
    })
  })
}
