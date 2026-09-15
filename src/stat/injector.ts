import { JSX, render } from "preact"
import { LocData } from "./loader"
import { openFallbackPage } from "./util"

export const STAT_ID = "github-loc"

export function isPublicRepository() {
  const repoVisibility = document.evaluate(
    '//*[@id="repo-title-component"]/span[2]',
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue

  return repoVisibility?.textContent !== "Private"
}

export function findAboutRoot(): HTMLElement | null {
  return (
    (document.evaluate(
      '//h2[normalize-space(.)="About" and not(@class="heading-element")]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue?.parentElement as HTMLElement | null) ?? null
  )
}

let locateObserver: MutationObserver | undefined
let locateGeneration = 0

export function locateRoot(): Promise<[HTMLElement, boolean]> {
  const generation = ++locateGeneration
  locateObserver?.disconnect()
  locateObserver = undefined

  return new Promise((resolve) => {
    const tryLocate = () => {
      if (generation !== locateGeneration) {
        return true
      }

      const root = findAboutRoot()
      if (!root) {
        return false
      }

      locateObserver?.disconnect()
      locateObserver = undefined
      resolve([root, isPublicRepository()])
      return true
    }

    if (!tryLocate()) {
      locateObserver = new MutationObserver(tryLocate)
      locateObserver.observe(document.documentElement, { childList: true, subtree: true })
    }
  })
}

export function injectStat(root: Element, stat: JSX.Element) {
  const existing = root.querySelector<HTMLElement>(`#${STAT_ID}`)
  const div = existing ?? document.createElement("div")

  if (!existing) {
    div.className = "mt-2"
    div.id = STAT_ID

    if (root.lastElementChild?.firstElementChild?.textContent?.includes("Report")) {
      root.insertBefore(div, root.lastElementChild)
    } else {
      root.appendChild(div)
    }
  }

  render(stat, div)

  return div
}

export function updateStat(stat: Element, value: number) {
  stat.firstElementChild!.lastElementChild!.textContent = value.toLocaleString()
}

export function updateLink(stat: Element, filter: string) {
  const link = stat.firstElementChild!.getAttribute("href")!
  stat.firstElementChild!.setAttribute("href", link + filter)
}

export function updateFallbackLink(stat: HTMLElement, data: LocData, org: string, repo: string) {
  stat = stat.firstElementChild! as HTMLElement
  stat.removeAttribute("href")

  stat.onclick = () => {
    openFallbackPage(data, org, repo)
  }
}
