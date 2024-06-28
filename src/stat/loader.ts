export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
}

function makeKey(org: string, repo: string, branch: string) {
  return org + "/" + repo + "/" + branch
}

async function sha1(str: string) {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(str))

  return Array.from(new Uint8Array(hash))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
}

export function loadLoc(org: string, repo: string, branch: string): Promise<number> {
  return new Promise((resolve) => {
    const key = makeKey(org, repo, branch)

    chrome.storage.local.get(key, (result) => {
      if (typeof result[key] === "number") {
        resolve(result[key])
      }
    })
  })
}

export async function fetchLoc(
  org: string,
  repo: string,
  branch: string,
): Promise<[number, LocData]> {
  let url = `https://ghloc-api.vercel.app/${org}/${repo}/${branch}`

  const accessToken = await chrome.storage.sync.get("accessToken")
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")

  const headers = new Headers({
    "Ghloc-Authorization": import.meta.env.VITE_AUTH_TOKEN,
  })

  if (Array.isArray(ignoredFiles.ignoredFiles) && ignoredFiles.ignoredFiles.length > 0) {
    url += "?match="

    for (const ignored of ignoredFiles.ignoredFiles) {
      url += "!" + ignored + "$,"
    }

    url = url.substring(0, url.length - 1)
  }

  if (typeof accessToken.accessToken === "string" && accessToken.accessToken.length > 0) {
    headers.append("Authorization", `Bearer ${accessToken.accessToken}`)

    url += url.includes("?match") ? "&" : "?"
    url += "salt=" + (await sha1(accessToken.accessToken))
  }

  let data: LocData = await fetch(url, {
    headers,
  })
    .then((res) => res.json())
    .then((data) => {
      if (typeof data !== "object") {
        throw new Error("Invalid response: " + JSON.stringify(data))
      }

      return data
    })

  chrome.storage.local.set({ [makeKey(org, repo, branch)]: data.loc })
  return [data.loc, data]
}
