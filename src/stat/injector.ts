import { JSX, render } from "preact"
import { LocData } from "./loader"
import { openFallbackPage } from "./util"

function isInjected(root: Element) {
  return root.querySelector("#github-loc") !== null
}

export function locateRoot(): Promise<[Element, boolean]> {
  return new Promise((resolve) => {
    const root = document.evaluate(
      '//h2[text()="About" and not(@class="heading-element")]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue?.parentElement

    const repoVisibility = document.evaluate(
      '//*[@id="repo-title-component"]/span[2]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue

    if (root && !isInjected(root)) {
      resolve([root, repoVisibility?.textContent !== "Private"])
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
