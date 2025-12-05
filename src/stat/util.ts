import { LocData } from "./loader"
import Fallback from "./fallback.html?raw"

export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function getTarget() {
  const path = window.location.pathname.split("/")
  let branch: string | undefined = path.slice(4).join("/")

  if (!branch) {
    branch = document
      .evaluate(
        '//*[@id="ref-picker-repos-header-ref-selector"]/span/span[1]/div/div[2]/span',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      )
      .singleNodeValue?.textContent?.trim()
  }

  return [path[1], path[2], branch || "main"]
}

export function getFilter(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("ignoredFiles").then((ignoredFiles) => {
      if (Array.isArray(ignoredFiles.ignoredFiles)) {
        let filter = "&filter="

        ignoredFiles.ignoredFiles.forEach((ignored) => {
          filter += "%21" + ignored + "%24%2C" // !md$,
        })

        resolve(filter.substring(0, filter.length - 3))
      }
    })
  })
}

export function openFallbackPage(data: LocData, org: string, repo: string) {
  const locByLangs = Object.entries(data.locByLangs).sort((a, b) => b[1] - a[1])
  const document = window.open()?.document

  let locTable = ""

  for (const [lang, loc] of locByLangs) {
    const percent = ((loc / data.loc) * 100).toFixed(2)
    locTable += `<tr><td>${lang}</td><td>${loc.toLocaleString()}</td><td>${percent}%</td></tr>\n`
  }

  const fallback = Fallback.replaceAll("$org", org)
    .replaceAll("$repo", repo)
    .replace("$loc", data.loc.toLocaleString())
    .replace("$locTable", locTable)

  document?.write(fallback)
  document?.close()
}
