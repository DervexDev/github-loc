import { JSX, render } from 'preact'

export function locateRoot() {
  return document.querySelector(
    '#repo-content-pjax-container > div > div > div.Layout.Layout--flowRow-until-md.react-repos-overview-margin.Layout--sidebarPosition-end.Layout--sidebarPosition-flowRow-end > div.Layout-sidebar > div > div:nth-child(1) > div > div',
  )
}

export function injectStat(root: Element, stat: JSX.Element) {
  const div = document.createElement('div')
  div.className = 'mt-2'

  root.insertBefore(div, root.lastElementChild)
  render(stat, div)

  return div.firstElementChild?.lastElementChild!
}
