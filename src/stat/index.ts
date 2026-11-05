import "./stat.css"
import { isPrivateRepository, removeStats, StatState, syncStats } from "./injector"
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
let syncTimer: ReturnType<typeof setTimeout> | undefined
let pendingForce = false

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
  const { org, repo, branch } = target

  target.filter = await loadMatchFilter()
  if (id !== runId) {
    return
  }

  const cached = await loadLoc(org, repo, branch)
  if (id !== runId) {
    return
  }

  if (cached) {
    target.locData = cached
    render()

    if (now() - cached.lastFetched < FETCH_RATE_LIMIT) {
      return
    }
  }

  try {
    const fresh = await fetchLoc(org, repo, branch)
    if (id === runId) {
      target.locData = fresh
      render()
    }
  } catch (err) {
    console.log("Failed to fetch LOC:", err)
  }
}

function render() {
  if (current) {
    syncStats(current.org, current.repo, stateOf(current))
  }
}

function sync(force = false) {
  if (!isRepoHomePath(location.pathname)) {
    current = null
    runId++
    removeStats()
    return
  }

  const [org, repo, branch] = getTarget()
  const key = `${org}/${repo}/${branch}`

  if (force || !current || current.key !== key) {
    const id = ++runId

    current = {
      key,
      org,
      repo,
      branch,
      isPrivate: isPrivateRepository(),
      filter: "",
      locData: null,
    }

    load(current, id)
  }

  render()
}

// Throttled rather than debounced, so a page that keeps mutating
// (e.g. live timestamps) cannot postpone the sync indefinitely.
function requestSync(force = false) {
  pendingForce ||= force
  if (syncTimer !== undefined) {
    return
  }

  syncTimer = setTimeout(() => {
    const forced = pendingForce
    syncTimer = undefined
    pendingForce = false
    sync(forced)
  }, 50)
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === "github-loc:update") {
    requestSync()
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.ignoredFiles || changes.accessToken)) {
    requestSync(true)
  }
})

for (const event of NAV_EVENTS) {
  window.addEventListener(event, () => requestSync())
}

// GitHub renders (and re-renders) the sidebar client-side, so watch the DOM
// and re-sync whenever the stat goes missing, gets duplicated or the URL
// changes. Syncing is idempotent, so our own DOM changes settle immediately.
new MutationObserver(() => requestSync()).observe(document.documentElement, {
  childList: true,
  subtree: true,
})

sync()
