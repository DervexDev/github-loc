/**
 * Locates the repository's "forks" stat in the About sidebar and injects a
 * "lines of code" stat right below it.
 *
 * Instead of depending on GitHub's (frequently changing, often hashed) class
 * names or on the sidebar's exact structure, we:
 *
 * 1. find the link that points to this exact repository's `/forks` page and
 *    carries the `repo-forked` octicon - this is the forks stat in the sidebar,
 * 2. skip anything inside user content (README, PR/issue bodies, comments),
 * 3. deep-clone the forks stat and rewrite its icon, number and label.
 *
 * Cloning means our stat inherits whatever markup and classes GitHub currently
 * uses, so it keeps looking like the other stats across redesigns. GitHub
 * renders the About section twice (narrow and wide layouts), so every matching
 * forks stat gets its own copy.
 */

export const STAT_ATTR = "data-github-loc"
const VALUE_ATTR = "data-github-loc-value"
const SVG_NS = "http://www.w3.org/2000/svg"

// Containers holding user-generated content (markdown, comments, PR bodies)
// or transient UI, where a "forks" link must never be treated as the stat.
const EXCLUDED_CONTAINERS = [
  ".markdown-body",
  ".comment-body",
  ".js-comment",
  ".timeline-comment",
  "[data-testid='markdown-body']",
  "[data-testid='issue-body']",
  "[data-testid='comment-body']",
  "article",
  "dialog",
  "[role='dialog']",
  "[role='menu']",
  "[role='tooltip']",
  "[popover]",
].join(",")

const ICON_PATHS = [
  "M5.75,13.29L8.89,2.32L10.23,2.71L7.08,13.67Z",
  "M2.06,8l2.27-2.27c.27-.27.27-.71,0-.98-.27-.27-.71-.27-.98,0L.59,7.5c-.14.14-.2.32-.2.5,0,.18.07.36.2.5l2.76,2.76c.27.27.71.27.98,0h0c.27-.27.27-.71,0-.98l-2.27-2.27Z",
  "M13.94,8l-2.27-2.27c-.27-.27-.27-.71,0-.98.27-.27.71-.27.98,0l2.76,2.76c.14.14.2.32.2.5,0,.18-.07.36-.2.5l-2.76,2.76c-.27.27-.71.27-.98,0h0c-.27-.27-.27-.71,0-.98l2.27-2.27Z",
]

const PRIVATE_VISIBILITY = new Set(["Private", "Internal"])

export interface StatState {
  href: string
  isPrivate: boolean
  value: string
}

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

  const labels = document.querySelectorAll(
    '[data-testid="repo-visibility-label"], #repository-container-header .Label, #repo-title-component .Label, #repo-title-component span',
  )
  for (const label of labels) {
    const text = label.textContent?.trim()
    if (text && PRIVATE_VISIBILITY.has(text)) {
      return true
    }
    if (text === "Public") {
      return false
    }
  }

  return false
}

function normalizePath(path: string) {
  return path.replace(/\/+$/, "").toLowerCase()
}

/** Returns the elements wrapping each forks stat of the given repository. */
export function findForkItems(org: string, repo: string): HTMLElement[] {
  const forksPath = normalizePath(`/${org}/${repo}/forks`)
  const items: HTMLElement[] = []

  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href*="/forks"]')) {
    if (link.host !== window.location.host || normalizePath(link.pathname) !== forksPath) {
      continue
    }
    if (!link.querySelector("svg.octicon-repo-forked")) {
      continue
    }
    if (link.closest(EXCLUDED_CONTAINERS) || link.closest(`[${STAT_ATTR}]`)) {
      continue
    }

    // Stats are usually wrapped in their own row element (e.g. `div.mt-2`),
    // clone that row so spacing matches. Fall back to the link itself.
    const parent = link.parentElement
    const item = parent && parent.childElementCount === 1 ? parent : link
    items.push(item)
  }

  return items
}

function getLink(stat: HTMLElement) {
  return stat instanceof HTMLAnchorElement ? stat : stat.querySelector<HTMLAnchorElement>("a")
}

function textNodesOutside(root: Node, skip: Element[]) {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!skip.some((el) => el.contains(node))) {
      nodes.push(node)
    }
  }

  return nodes
}

function setIcon(svg: SVGElement) {
  svg.classList.remove("octicon-repo-forked")
  svg.classList.add("octicon-code")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.replaceChildren(
    ...ICON_PATHS.map((d) => {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", d)
      return path
    }),
  )
}

function createStat(forkItem: HTMLElement): HTMLElement | null {
  const stat = forkItem.cloneNode(true) as HTMLElement
  const link = getLink(stat)
  if (!link) {
    return null
  }

  stat.setAttribute(STAT_ATTR, "")
  for (const el of [stat, ...stat.querySelectorAll("*")]) {
    el.removeAttribute("id")
    el.removeAttribute("data-discover")
    el.removeAttribute("data-hovercard-url")
    el.removeAttribute("data-pjax")
  }
  link.setAttribute("data-turbo", "false")

  let svg = link.querySelector<SVGElement>("svg")
  if (svg) {
    setIcon(svg)
  }

  let strong = link.querySelector("strong")
  if (!strong) {
    // Unknown structure - rebuild contents as: icon, number, label.
    link.replaceChildren(...(svg ? [svg] : []))
    strong = document.createElement("strong")
    link.append(strong, document.createTextNode(" lines of code"))
  } else {
    // Replace the "forks" label, keeping its wrapper elements and spacing.
    const labels = textNodesOutside(link, [strong, ...(svg ? [svg] : [])]).filter((node) =>
      node.textContent?.trim(),
    )

    if (labels.length === 0) {
      strong.after(document.createTextNode(" lines of code"))
    } else {
      const [first, ...rest] = labels
      const leading = /^\s/.test(first.textContent!) ? " " : ""
      first.textContent = `${leading}lines of code`
      rest.forEach((node) => (node.textContent = ""))
    }
  }

  strong.setAttribute(VALUE_ATTR, "")

  return stat
}

function applyState(stat: HTMLElement, state: StatState) {
  const link = getLink(stat)
  if (!link) {
    return
  }

  if (link.getAttribute("href") !== state.href) {
    link.setAttribute("href", state.href)
  }

  if (state.isPrivate) {
    link.setAttribute("target", "_blank")
    link.setAttribute("rel", "noopener")
  } else {
    link.removeAttribute("target")
    link.removeAttribute("rel")
  }

  const value = stat.querySelector(`[${VALUE_ATTR}]`)
  if (value && value.textContent !== state.value) {
    value.textContent = state.value
  }
}

export function removeStats(keep: Set<Element> = new Set()) {
  for (const stat of document.querySelectorAll(`[${STAT_ATTR}]`)) {
    if (!keep.has(stat)) {
      stat.remove()
    }
  }
}

/**
 * Makes sure there is exactly one stat right below every forks stat of the
 * repository, all reflecting `state`. Removes stats anywhere else (e.g. left
 * over after navigating away). Returns whether at least one stat is present.
 */
export function syncStats(org: string, repo: string, state: StatState): boolean {
  const keep = new Set<Element>()

  for (const item of findForkItems(org, repo)) {
    let stat = item.nextElementSibling as HTMLElement | null

    if (!stat?.hasAttribute(STAT_ATTR)) {
      const created = createStat(item)
      if (!created) {
        continue
      }

      stat = created
      item.after(stat)
    }

    applyState(stat, state)
    keep.add(stat)
  }

  removeStats(keep)

  return keep.size > 0
}
