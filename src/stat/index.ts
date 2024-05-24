import { locateRoot, injectStat, updateStat, updateLink } from './injector'
import { fetchLoc, loadLoc } from './loader'
import { getTarget, getFilter } from './util'
import Stat from './Stat'

function main() {
  locateRoot().then((root) => {
    const [org, repo] = getTarget()

    const statJSX = Stat({
      org,
      repo,
    })

    const stat = injectStat(root, statJSX)
    let fetched = false

    loadLoc(org, repo).then((loc) => {
      if (!fetched) {
        updateStat(stat, loc)
      }
    })

    fetchLoc(org, repo)
      .then((loc) => {
        fetched = true
        updateStat(stat, loc)
      })
      .catch((err) => {
        console.log('Failed to fetch LOC:', err)
      })

    getFilter().then((filter) => {
      updateLink(stat, filter)
    })
  })
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === 'github-loc:update') {
    main()
  }
})

main()
