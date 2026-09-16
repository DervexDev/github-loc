import { DEFAULT_IGNORED_FILES } from "../defaults"

export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function ignoredFilesToFilter(ignoredFiles: unknown): string {
  const files = Array.isArray(ignoredFiles)
    ? ignoredFiles.filter((file): file is string => typeof file === "string" && file.length > 0)
    : DEFAULT_IGNORED_FILES

  return files.map((file) => `!${file}$`).join(",")
}

export function loadMatchFilter(): Promise<string> {
  return chrome.storage.sync.get("ignoredFiles").then((result) => {
    return ignoredFilesToFilter(result.ignoredFiles)
  })
}

function getBranchFromSelector() {
  const branchSelector =
    document.querySelector<HTMLElement>("#ref-picker-repos-header-ref-selector") ??
    document.querySelector<HTMLElement>('[data-testid="anchor-button"][aria-label$=" branch"]')
  const ariaLabel = branchSelector?.getAttribute("aria-label")

  return ariaLabel?.replace(/\s+branch$/i, "").trim() || branchSelector?.textContent?.trim()
}

export function getTarget() {
  const path = window.location.pathname.split("/")
  const branchFromPath =
    path[3] === "tree" || path[3] === "blob" ? path.slice(4).join("/") : undefined
  const branch = branchFromPath || getBranchFromSelector() || ""

  return [path[1], path[2], branch]
}

export function getFilter(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("ignoredFiles").then((ignoredFiles) => {
      if (Array.isArray(ignoredFiles.ignoredFiles)) {
        let filter = "&filter="

        ignoredFiles.ignoredFiles.forEach((ignored) => {
          filter += "%21" + ignored + "%24%2C" // !md$,
        })

        resolve(filter.substring(0, filter.length - 3))
      }
    })
  })
}
