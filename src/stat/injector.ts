import { JSX, render } from "preact"
import { LocData } from "./loader"
import { openFallbackPage } from "./util"

function isInjected(root: Element) {
  return root.querySelector("#github-loc") !== null
}

export function locateRoot(): Promise<[Element, boolean]> {
  return new Promise((resolve) => {
    let observer: MutationObserver | undefined

    const tryLocate = () => {
      const root = document.evaluate(
        '//h2[normalize-space(.)="About" and not(@class="heading-element")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue?.parentElement

      if (!root) {
        return false
      }

      if (isInjected(root)) {
        observer?.disconnect()
        return true
      }

      const repoVisibility = document.evaluate(
        '//*[@id="repo-title-component"]/span[2]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue

      observer?.disconnect()
      resolve([root, repoVisibility?.textContent !== "Private"])
      return true
    }

    if (!tryLocate()) {
      observer = new MutationObserver(tryLocate)
      observer.observe(document.documentElement, { childList: true, subtree: true })
    }
  })
}

export function injectStat(root: Element, stat: JSX.Element) {
  const div = document.createElement("div")
  div.className = "mt-2"
  div.id = "github-loc"

  if (root.lastElementChild?.firstElementChild?.textContent?.includes("Report")) {
    root.insertBefore(div, root.lastElementChild)
  } else {
    root.appendChild(div)
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
