chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url)

    if (url.pathname.split('/').length > 2) {
      chrome.tabs.sendMessage(tabId, 'github-loc:update').catch(() => {})
    }
  }
})
