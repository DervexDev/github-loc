import { JSX, render } from 'preact'

const SELECTOR = `#repo-content-pjax-container > div > div > \
  div.Layout.Layout--flowRow-until-md.react-repos-overview-margin.Layout--sidebarPosition-end.Layout--sidebarPosition-flowRow-end \
  > div.Layout-sidebar > div > div:nth-child(1) > div > div`

export function locateRoot(): Promise<Element> {
  return new Promise((resolve) => {
    const element = document.querySelector(SELECTOR)

    if (element) {
      return resolve(element)
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(SELECTOR)

      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
}

export function injectStat(root: Element, stat: JSX.Element) {
  const div = document.createElement('div')
  div.className = 'mt-2'

  if (root.lastElementChild?.firstElementChild?.textContent?.includes('Report')) {
    root.insertBefore(div, root.lastElementChild)
  } else {
    root.appendChild(div)
  }

  render(stat, div)
  root.id = 'github-loc'

  return div.firstElementChild?.lastElementChild!
}

export function updateStat(stat: Element, value: number) {
  stat.textContent = value.toLocaleString()
}
