import { Locs, LocsChild } from "../stat/loader"

export type SortOrder = "type" | "locs"

export function isFolder(child: LocsChild): child is Locs {
  return typeof child !== "number"
}

export function getLocsValue(child: LocsChild): number {
  return typeof child === "number" ? child : child.loc
}

export function langName(fileName: string) {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0) {
    return fileName
  }

  return fileName.slice(dot)
}

function matches(path: string, matcher: string) {
  const wrapped = "^" + path + "$"
  const trimmed = matcher.trim()
  let matched = trimmed.startsWith("!")

  for (const pattern of trimmed.split(",")) {
    if (pattern.startsWith("!")) {
      if (wrapped.includes(pattern.slice(1))) {
        matched = false
      }
    } else if (wrapped.includes(pattern)) {
      matched = true
    }
  }

  return matched
}

function flatten(node: Locs, prefix = ""): Array<[string, number]> {
  const files: Array<[string, number]> = []

  for (const [name, child] of Object.entries(node.children ?? {})) {
    const path = prefix ? `${prefix}/${name}` : name

    if (typeof child === "number") {
      files.push([path, child])
    } else {
      files.push(...flatten(child, path))
    }
  }

  return files
}

function emptyDir(): Locs {
  return { loc: 0, locByLangs: {}, children: {} }
}

function addFile(root: Locs, filePath: string, loc: number) {
  const parts = filePath.split("/")
  const fileName = parts.pop()
  if (!fileName) {
    return
  }

  let node = root
  for (const dir of parts) {
    const children = node.children!
    if (!children[dir] || !isFolder(children[dir])) {
      children[dir] = emptyDir()
    }
    node = children[dir] as Locs
  }

  node.children![fileName] = loc
}

function recount(dir: Locs) {
  dir.loc = 0
  dir.locByLangs = {}

  for (const [name, child] of Object.entries(dir.children ?? {})) {
    if (isFolder(child)) {
      recount(child)
      dir.loc += child.loc

      for (const [lang, loc] of Object.entries(child.locByLangs)) {
        dir.locByLangs[lang] = (dir.locByLangs[lang] ?? 0) + loc
      }
    } else {
      const loc = getLocsValue(child)
      const lang = langName(name)
      dir.loc += loc
      dir.locByLangs[lang] = (dir.locByLangs[lang] ?? 0) + loc
    }
  }
}

export function filterTree(root: Locs, matcher?: string): Locs {
  if (!matcher?.trim() || !root.children) {
    return root
  }

  const filtered = emptyDir()
  for (const [path, loc] of flatten(root)) {
    if (matches(path, matcher)) {
      addFile(filtered, path, loc)
    }
  }

  recount(filtered)
  return filtered
}

export function getNodeAtPath(root: Locs, path: string[]): Locs | null {
  let node: Locs = root

  for (const segment of path) {
    const child = node.children?.[segment]
    if (!child || !isFolder(child)) {
      return null
    }
    node = child
  }

  return node
}

export function sortChildren(node: Locs, order: SortOrder): Locs {
  if (!node.children) {
    return node
  }

  const entries = Object.entries(node.children)

  if (order === "locs") {
    entries.sort((a, b) => getLocsValue(b[1]) - getLocsValue(a[1]) || (a[0] < b[0] ? -1 : 1))
  } else {
    entries.sort((a, b) => {
      const folderA = isFolder(a[1])
      const folderB = isFolder(b[1])
      if (folderA !== folderB) {
        return Number(folderB) - Number(folderA)
      }
      return a[0] < b[0] ? -1 : 1
    })
  }

  const children: { [name: string]: LocsChild } = {}
  for (const [name, child] of entries) {
    children[name] = child
  }

  return { ...node, children }
}
