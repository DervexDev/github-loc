import { locateRoot, injectStat, updateStat } from './injector'
import { fetchLoc, loadLoc } from './loader'
import getTarget from './getTarget'
import Stat from './Stat'

function main() {
  locateRoot().then((root) => {
    const [org, repo] = getTarget()

    const stat = Stat({
      org,
      repo,
    })

    const value = injectStat(root, stat)
    let fetched = false

    loadLoc(org, repo).then((loc) => {
      if (!fetched) {
        updateStat(value, loc)
      }
    })

    fetchLoc(org, repo)
      .then((loc) => {
        fetched = true
        updateStat(value, loc)
      })
      .catch((err) => {
        console.log('Failed to fetch LOC:', err)
      })
  })
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === 'github-loc:update') {
    main()
  }
})

main()
