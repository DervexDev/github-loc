import { LocData } from './loader'
import Fallback from './fallback.html?raw'

export function getTarget() {
  const orgRepo = window.location.pathname.split('/').slice(1, 3)

  let branch = document.evaluate(
    '//*[@id="branch-picker-repos-header-ref-selector"]/span/span[1]/div/div[2]/span',
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue?.textContent

  branch = branch?.substring(1)

  return [orgRepo[0], orgRepo[1], branch || 'main']
}

export function getFilter(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('ignoredFiles').then((ignoredFiles) => {
      if (Array.isArray(ignoredFiles.ignoredFiles)) {
        let filter = '?filter='

        ignoredFiles.ignoredFiles.forEach((ignored) => {
          filter += '%21' + ignored + '%24%2C' // !md$,
        })

        resolve(filter.substring(0, filter.length - 3))
      }
    })
  })
}

export function openFallbackPage(data: LocData, totalLoc: number, org: string, repo: string) {
  const document = window.open()?.document

  let locTable = ''

  for (const [lang, loc] of Object.entries(data.locByLangs)) {
    const percent = ((loc / totalLoc) * 100).toFixed(2)

    locTable += `<tr><td>${lang}</td><td>${loc.toLocaleString()}</td><td>${percent}%</td></tr>\n`
  }

  const fallback = Fallback.replaceAll('$org', org)
    .replaceAll('$repo', repo)
    .replace('$loc', totalLoc.toLocaleString())
    .replace('$locTable', locTable)

  console.log(fallback)

  document?.write(fallback)
  document?.close()
}
