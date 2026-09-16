import { now } from "./util"

export type LocsChild = Locs | number

export interface Locs {
  loc: number
  locByLangs: { [lang: string]: number }
  children?: { [name: string]: LocsChild }
}

export interface LocData extends Locs {
  lastFetched: number
}

export function makeKey(org: string, repo: string, branch: string) {
  return org + "/" + repo + "/" + branch
}

async function sha1(str: string) {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(str))

  return Array.from(new Uint8Array(hash))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
}

export function loadLoc(org: string, repo: string, branch: string): Promise<LocData | null> {
  return new Promise((resolve) => {
    const key = makeKey(org, repo, branch)

    chrome.storage.local.get(key, (data) => {
      const locData = data[key] as LocData

      if (isLocData(locData)) {
        resolve(locData)
      } else {
        resolve(null)
      }
    })
  })
}

export async function fetchLoc(org: string, repo: string, branch: string): Promise<LocData> {
  const branchPath = branch ? `/${branch}` : ""
  let url = `https://ghloc-api.vercel.app/${org}/${repo}${branchPath}`

  const accessToken = await chrome.storage.sync.get("accessToken")

  const headers = new Headers({
    "Ghloc-Authorization": import.meta.env.VITE_AUTH_TOKEN,
  })

  if (typeof accessToken.accessToken === "string" && accessToken.accessToken.length > 0) {
    headers.append("Authorization", `Bearer ${accessToken.accessToken}`)
    url += "?salt=" + (await sha1(accessToken.accessToken))
  }

  let data: LocData = await fetch(url, { headers })
    .then((res) => res.json())
    .then((data) => {
      if (typeof data !== "object") {
        throw new Error("Invalid response: " + JSON.stringify(data))
      }

      if (data.error) {
        throw new Error(data.error)
      }

      return data
    })

  data.lastFetched = now()
  chrome.storage.local.set({ [makeKey(org, repo, branch)]: data })

  return data
}

export function watchLoc(
  org: string,
  repo: string,
  branch: string,
  onChange: (data: LocData | null) => void,
): () => void {
  const key = makeKey(org, repo, branch)

  loadLoc(org, repo, branch).then(onChange)

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== "local" || !changes[key]) {
      return
    }

    const value = changes[key].newValue
    onChange(isLocData(value) ? value : null)
  }

  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

function isLocData(value: unknown): value is LocData {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const data = value as LocData
  return (
    typeof data.loc === "number" &&
    typeof data.locByLangs === "object" &&
    data.locByLangs !== null &&
    typeof data.lastFetched === "number"
  )
}
