/// <reference types="chrome" />

import { now } from "./util"

export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
  lastFetched: number
}

function makeKey(org: string, repo: string, branch: string) {
  return org + "/" + repo + "/" + branch
}

export function loadLoc(org: string, repo: string, branch: string): Promise<LocData | null> {
  return new Promise((resolve) => {
    const key = makeKey(org, repo, branch)

    chrome.storage.local.get(key, (data: { [key: string]: unknown }) => {
      const locData = data[key] as LocData

      if (
        typeof locData === "object" &&
        typeof locData.loc === "number" &&
        typeof locData.locByLangs === "object" &&
        typeof locData.lastFetched === "number"
      ) {
        resolve(locData as LocData)
      } else {
        resolve(null)
      }
    })
  })
}

export async function fetchLoc(org: string, repo: string, branch: string): Promise<LocData> {
  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/")
  const params = new URLSearchParams({ pretty: "false" })
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")

  if (Array.isArray(ignoredFiles.ignoredFiles) && ignoredFiles.ignoredFiles.length > 0) {
    params.set(
      "filter",
      (ignoredFiles.ignoredFiles as string[]).map((ignored: string) => `!${ignored}$`).join(","),
    )
  }

  const url = `https://ghloc.ifels.dev/${encodeURIComponent(org)}/${encodeURIComponent(
    repo,
  )}/${encodedBranch}?${params}`
  const headers = new Headers()
  const authToken = import.meta.env.VITE_AUTH_TOKEN

  if (typeof authToken === "string" && authToken.length > 0) {
    headers.set("Ghloc-Authorization", authToken)
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
