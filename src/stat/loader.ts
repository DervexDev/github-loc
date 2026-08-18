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

export async function fetchLoc(
  org: string,
  repo: string,
  branch: string,
  isPublic: boolean,
): Promise<LocData> {
  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/")
  const params = new URLSearchParams({ pretty: "false" })
  const accessToken = await chrome.storage.sync.get("accessToken")
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")

  if (Array.isArray(ignoredFiles.ignoredFiles) && ignoredFiles.ignoredFiles.length > 0) {
    params.set(
      "filter",
      (ignoredFiles.ignoredFiles as string[]).map((ignored: string) => `!${ignored}$`).join(","),
    )
  }

  const branchPath = encodedBranch ? `/${encodedBranch}` : ""
  const configuredApiUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl =
    typeof configuredApiUrl === "string" && configuredApiUrl.length > 0
      ? configuredApiUrl.replace(/\/$/, "")
      : isPublic
        ? "https://ghloc.ifels.dev"
        : "https://ghloc-api.vercel.app"
  const headers = new Headers()
  const authToken = import.meta.env.VITE_AUTH_TOKEN

  if (typeof authToken === "string" && authToken.length > 0) {
    headers.set("Ghloc-Authorization", authToken)
  }

  if (
    !isPublic &&
    typeof accessToken.accessToken === "string" &&
    accessToken.accessToken.length > 0
  ) {
    headers.set("Authorization", `Bearer ${accessToken.accessToken}`)
    params.set("salt", await sha1(accessToken.accessToken))
  }

  const url = `${apiBaseUrl}/${encodeURIComponent(
    org,
  )}/${encodeURIComponent(repo)}${branchPath}?${params}`

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
