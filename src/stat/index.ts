import { locateRoot, injectStat } from './injector'
import getTarget from './getTarget'
import Stat from './Stat'
import fetchLoc from './fetchLoc'

const root = locateRoot()

if (root) {
  const [org, repo] = getTarget()

  const stat = Stat({
    org,
    repo,
  })

  const value = injectStat(root, stat)

  fetchLoc(org, repo).then((data) => {
    value.textContent = data.loc.toLocaleString()
  })
}
