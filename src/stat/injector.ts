import { JSX, render } from 'preact'

function isInjected(root: Element) {
  return root.querySelector('#github-loc') !== null
}

export function locateRoot(): Promise<Element> {
  return new Promise((resolve) => {
    const root = document.evaluate(
      "//h2[text()='About']",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue?.parentElement

    if (root && !isInjected(root)) {
      resolve(root)
    }
  })
}

export function injectStat(root: Element, stat: JSX.Element) {
  const div = document.createElement('div')
  div.className = 'mt-2'
  div.id = 'github-loc'

  if (root.lastElementChild?.firstElementChild?.textContent?.includes('Report')) {
    root.insertBefore(div, root.lastElementChild)
  } else {
    root.appendChild(div)
  }

  render(stat, div)

  return div.firstElementChild?.lastElementChild!
}

export function updateStat(stat: Element, value: number) {
  stat.textContent = value.toLocaleString()
}
