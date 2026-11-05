import "./stat.css"
import {
  findForkItems,
  ForkItem,
  isPrivateRepository,
  removeStats,
  sameRepo,
  StatState,
  syncStats,
} from "./injector"
import { filterTree } from "../details/tree"
import { fetchLoc, LocData, loadLoc } from "./loader"
import { getTarget, isRepoHomePath, loadMatchFilter, now } from "./util"

const FETCH_RATE_LIMIT = 10 * 60
const NAV_EVENTS = ["turbo:load", "turbo:render", "popstate", "pageshow"] as const
const PLACEHOLDER = "…"

interface Current {
  key: string
  org: string
  repo: string
  branch: string
  isPrivate: boolean
  filter: string
  locData: LocData | null
}

let current: Current | null = null
let runId = 0

// In-memory copies of what was last loaded, so that coming back to a
// repository page (client-side navigation) shows the stat with its value
// right away instead of waiting for async storage reads.
const memoryCache = new Map<string, LocData>()
let lastFilter: string | null = null

function publicHref(org: string, repo: string, branch: string, filter: string) {
  const url = new URL(`https://ghloc.vercel.app/${org}/${repo}`)
  if (branch) {
    url.searchParams.set("branch", branch)
  }
  if (filter) {
    url.searchParams.set("filter", filter)
  }
  return url.toString()
}

function privateHref(org: string, repo: string, branch: string) {
  const url = new URL(chrome.runtime.getURL("src/details/index.html"))
  url.searchParams.set("org", org)
  url.searchParams.set("repo", repo)
  if (branch) {
    url.searchParams.set("branch", branch)
  }
  return url.toString()
}

function stateOf(target: Current): StatState {
  const { org, repo, branch, isPrivate, filter, locData } = target

  return {
    href: isPrivate ? privateHref(org, repo, branch) : publicHref(org, repo, branch, filter),
    isPrivate,
    value: locData ? filterTree(locData, filter).loc.toLocaleString() : PLACEHOLDER,
  }
}

async function load(target: Current, id: number) {
  const { key, org, repo, branch } = target

  target.filter = lastFilter = await loadMatchFilter()
  if (id !== runId) {
    return
  }

  const cached = target.locData ?? (await loadLoc(org, repo, branch))
  if (id !== runId) {
    return
  }

  if (cached) {
    target.locData = cached
    memoryCache.set(key, cached)
    sync()

    if (now() - cached.lastFetched < FETCH_RATE_LIMIT) {
      return
    }
  }

  try {
    const fresh = await fetchLoc(org, repo, branch)
    memoryCache.set(key, fresh)
    if (id === runId) {
      target.locData = fresh
      sync()
    }
  } catch (err) {
    console.log("Failed to fetch LOC:", err)
  }
}

/**
 * Decides which repository the stats are for. Note that on client-side
 * navigation GitHub updates the URL first and swaps the page content later,
 * so the forks stats in the page (not the URL) decide what is shown, and the
 * stat stays until GitHub actually removes the sidebar.
 */
function resolveTarget(items: ForkItem[]) {
  if (isRepoHomePath(location.pathname)) {
    const [org, repo, branch] = getTarget()
    if (items.some((item) => sameRepo(item, { org, repo }))) {
      return { org, repo, branch }
    }
  }

  // The previous page is still displayed while the next one loads.
  if (current && items.some((item) => sameRepo(item, current!))) {
    return current
  }

  return null
}

function sync(force = false) {
  const items = findForkItems()
  const target = resolveTarget(items)

  if (!target) {
    removeStats()
    return
  }

  const { org, repo, branch } = target
  const key = `${org}/${repo}/${branch}`

  if (force || !current || current.key !== key) {
    const id = ++runId

    current = {
      key,
      org,
      repo,
      branch,
      isPrivate: isPrivateRepository(),
      filter: lastFilter ?? "",
      locData: memoryCache.get(key) ?? null,
    }

    load(current, id)
  }

  syncStats(
    items.filter((item) => sameRepo(item, target)),
    stateOf(current),
  )
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === "github-loc:update") {
    sync()
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.ignoredFiles || changes.accessToken)) {
    sync(true)
  }
})

for (const event of NAV_EVENTS) {
  window.addEventListener(event, () => sync())
}

// GitHub renders (and re-renders) the sidebar client-side, so watch the DOM
// and sync right away (mutation callbacks are already batched), so the stat
// appears together with the sidebar. Syncing is idempotent, so our own DOM
// changes settle immediately instead of looping.
new MutationObserver(() => sync()).observe(document.documentElement, {
  childList: true,
  subtree: true,
})

sync()
