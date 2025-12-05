import { locateRoot, injectStat, updateStat, updateLink, updateFallbackLink } from "./injector"
import { fetchLoc, loadLoc } from "./loader"
import { getTarget, getFilter, now } from "./util"
import Stat from "./Stat"

const FETCH_RATE_LIMIT = 10 * 60

function main() {
  locateRoot().then(([root, isPublic]) => {
    const [org, repo, branch] = getTarget()

    const statJSX = Stat({
      org,
      repo,
      branch,
    })

    const stat = injectStat(root, statJSX)

    loadLoc(org, repo, branch).then((locData) => {
      if (isPublic) {
        getFilter().then((filter) => {
          updateLink(stat, filter)
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

chrome.runtime.onMessage.addListener((message) => {
  if (message === "github-loc:update") {
    main()
  }
})

main()
