import { locateRoot, injectStat, updateStat, updateLink, updateFallbackLink } from './injector'
import { fetchLoc, loadLoc } from './loader'
import { getTarget, getFilter } from './util'
import Stat from './Stat'

function main() {
  locateRoot().then(([root, isPublic]) => {
    const [org, repo, branch] = getTarget()

    const statJSX = Stat({
      org,
      repo,
      branch,
    })

    const stat = injectStat(root, statJSX)
    let fetched = false

    loadLoc(org, repo, branch).then((loc) => {
      if (!fetched) {
        updateStat(stat, loc)
      }
    })

    fetchLoc(org, repo, branch)
      .then(([totalLoc, locData]) => {
        fetched = true

        updateStat(stat, totalLoc)

        if (!isPublic) {
          updateFallbackLink(stat, locData, totalLoc, org, repo)
        }
      })
      .catch((err) => {
        console.log('Failed to fetch LOC:', err)
      })

    if (isPublic) {
      getFilter().then((filter) => {
        updateLink(stat, filter)
      })
    }
  })
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === 'github-loc:update') {
    main()
  }
})

main()
