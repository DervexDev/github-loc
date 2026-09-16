import { JSX, render } from "preact"

export const STAT_ID = "github-loc"

const PRIVATE_VISIBILITY = new Set(["Private", "Internal"])

export function isPrivateRepository() {
  const publicMeta = document
    .querySelector('meta[name="octolytics-dimension-repository_public"]')
    ?.getAttribute("content")

  if (publicMeta === "false") {
    return true
  }
  if (publicMeta === "true") {
    return false
  }

  const header = document.getElementById("repository-container-header")
  for (const label of header?.querySelectorAll(".Label") ?? []) {
    const text = label.textContent?.trim()
    if (text && PRIVATE_VISIBILITY.has(text)) {
      return true
    }
    if (text === "Public") {
      return false
    }
  }

  const legacyVisibility = document
    .evaluate(
      '//*[@id="repo-title-component"]/span[2]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )
    .singleNodeValue?.textContent?.trim()

  return !!legacyVisibility && PRIVATE_VISIBILITY.has(legacyVisibility)
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
      resolve([root, isPrivateRepository()])
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
