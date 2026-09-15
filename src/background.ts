import { DEFAULT_IGNORED_FILES } from "./defaults"

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || (changeInfo.status !== "complete" && !changeInfo.url)) {
    return
  }

  const url = new URL(tab.url)

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return
  }

  if (url.pathname.split("/").length > 2) {
    chrome.tabs.sendMessage(tabId, "github-loc:update").catch(() => {})
  }
})

chrome.runtime.onInstalled.addListener(async () => {
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")

  if (!Array.isArray(ignoredFiles.ignoredFiles)) {
    chrome.storage.sync.set({ ignoredFiles: DEFAULT_IGNORED_FILES })
  }
})
