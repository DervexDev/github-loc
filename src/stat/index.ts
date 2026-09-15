import "./stat.css"
import {
  locateRoot,
  injectStat,
  updateStat,
  updateLink,
  updateFallbackLink,
  findAboutRoot,
  STAT_ID,
} from "./injector"
import { fetchLoc, loadLoc } from "./loader"
import { getTarget, getFilter, now } from "./util"
import Stat from "./Stat"

const FETCH_RATE_LIMIT = 10 * 60
const NAV_EVENTS = ["turbo:load", "turbo:render", "popstate"] as const

let runId = 0
let lastTarget = ""
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let missingTimer: ReturnType<typeof setTimeout> | undefined

function targetKey(org: string, repo: string, branch: string) {
  return `${org}/${repo}/${branch}`
}

function main() {
  locateRoot().then(([root, isPublic]) => {
    const [org, repo, branch] = getTarget()
    if (!org || !repo) {
      return
    }

    const key = targetKey(org, repo, branch)
    if (root.querySelector(`#${STAT_ID}`) && lastTarget === key) {
      return
    }

    lastTarget = key
    const id = ++runId

    const statJSX = Stat({
      org,
      repo,
      branch,
    })

    const stat = injectStat(root, statJSX)

    loadLoc(org, repo, branch).then((locData) => {
      if (id !== runId) {
        return
      }

      if (isPublic) {
        getFilter().then((filter) => {
          if (id === runId) {
            updateLink(stat, filter)
          }
        })
      }

      if (locData) {
        updateStat(stat, locData.loc)

        if (now() - locData.lastFetched < FETCH_RATE_LIMIT) {
          if (!isPublic) {
            updateFallbackLink(stat, locData, org, repo)
          }

          return
        }
      }

      fetchLoc(org, repo, branch)
        .then((locData) => {
          if (id !== runId) {
            return
          }

          updateStat(stat, locData.loc)

          if (!isPublic) {
            updateFallbackLink(stat, locData, org, repo)
          }
        })
        .catch((err) => {
          console.log("Failed to fetch LOC:", err)
        })
    })
  })
}

function requestUpdate() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(main, 50)
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === "github-loc:update") {
    lastTarget = ""
    requestUpdate()
  }
})

for (const event of NAV_EVENTS) {
  window.addEventListener(event, () => {
    lastTarget = ""
    requestUpdate()
  })
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    lastTarget = ""
    requestUpdate()
  }
})

new MutationObserver(() => {
  clearTimeout(missingTimer)
  missingTimer = setTimeout(() => {
    if (document.getElementById(STAT_ID) || !findAboutRoot()) {
      return
    }

    lastTarget = ""
    main()
  }, 50)
}).observe(document.documentElement, { childList: true, subtree: true })

main()
