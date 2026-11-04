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

// Reserved first path segments that are never a repository owner.
const NON_REPO_OWNERS = new Set([
  "orgs",
  "settings",
  "notifications",
  "marketplace",
  "topics",
  "collections",
  "explore",
  "search",
  "sponsors",
  "login",
  "logout",
  "new",
  "organizations",
  "pulls",
  "issues",
  "codespaces",
  "features",
  "enterprise",
  "about",
  "pricing",
])

/** Whether the path is a repository's main page, the only one with the About sidebar. */
export function isRepoHomePath(pathname: string) {
  const path = pathname.split("/").filter(Boolean)
  if (path.length < 2 || NON_REPO_OWNERS.has(path[0].toLowerCase())) {
    return false
  }

  return path.length === 2 || (path[2] === "tree" && path.length > 3)
}
