/// <reference types="chrome" />

import { now } from "./util"

export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
  lastFetched: number
}

interface GitHubTreeEntry {
  path: string
  sha: string
  type: string
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[]
  truncated: boolean
}

interface GitHubBlobResponse {
  content: string
  encoding: string
}

interface GitHubRepositoryResponse {
  default_branch: string
}

const GITHUB_API = "https://api.github.com"
const BLOB_BATCH_SIZE = 10

function makeKey(org: string, repo: string, branch: string) {
  return org + "/" + repo + "/" + branch
}

async function fetchGitHubJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `GitHub API request failed (${response.status})`)
  }

  return data as T
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ""))
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function countTextLines(bytes: Uint8Array) {
  if (bytes.includes(0)) {
    return 0
  }

  const text = new TextDecoder().decode(bytes)

  if (text.length === 0) {
    return 0
  }

  const lines = text.split(/\r\n|\r|\n/)
  return lines.length - (/(?:\r\n|\r|\n)$/.test(text) ? 1 : 0)
}

function getFileExtension(path: string) {
  const fileName = path.split("/").pop() || path
  const dotIndex = fileName.lastIndexOf(".")

  return dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : fileName
}

function isIgnored(path: string, ignoredFiles: string[]) {
  return ignoredFiles.some((ignored) => path.toLowerCase().endsWith(ignored.toLowerCase()))
}

async function fetchLocalLoc(
  org: string,
  repo: string,
  branch: string,
  ignoredFiles: string[],
): Promise<LocData> {
  const accessToken = await chrome.storage.sync.get("accessToken")

  if (typeof accessToken.accessToken !== "string" || accessToken.accessToken.length === 0) {
    throw new Error("A GitHub access token is required for private repositories")
  }

  const token = accessToken.accessToken
  const repository = branch
    ? null
    : await fetchGitHubJson<GitHubRepositoryResponse>(
        `${GITHUB_API}/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}`,
        token,
      )
  const ref = branch || repository!.default_branch
  const tree = await fetchGitHubJson<GitHubTreeResponse>(
    `${GITHUB_API}/repos/${encodeURIComponent(org)}/${encodeURIComponent(
      repo,
    )}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  )

  if (tree.truncated) {
    throw new Error("The repository tree is too large to count in the browser")
  }

  const files = tree.tree.filter(
    (entry) => entry.type === "blob" && !isIgnored(entry.path, ignoredFiles),
  )
  const locByLangs: { [lang: string]: number } = {}

  for (let index = 0; index < files.length; index += BLOB_BATCH_SIZE) {
    const batch = files.slice(index, index + BLOB_BATCH_SIZE)
    const lineCounts = await Promise.all(
      batch.map(async (file) => {
        const blob = await fetchGitHubJson<GitHubBlobResponse>(
          `${GITHUB_API}/repos/${encodeURIComponent(org)}/${encodeURIComponent(
            repo,
          )}/git/blobs/${file.sha}`,
          token,
        )

        if (blob.encoding !== "base64") {
          return { extension: getFileExtension(file.path), lines: 0 }
        }

        return {
          extension: getFileExtension(file.path),
          lines: countTextLines(decodeBase64(blob.content)),
        }
      }),
    )

    for (const { extension, lines } of lineCounts) {
      locByLangs[extension] = (locByLangs[extension] || 0) + lines
    }
  }

  return {
    loc: Object.values(locByLangs).reduce((total, lines) => total + lines, 0),
    locByLangs,
    lastFetched: 0,
  }
}

async function fetchPublicLoc(org: string, repo: string, branch: string, ignoredFiles: string[]) {
  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/")
  const params = new URLSearchParams({ pretty: "false" })

  if (ignoredFiles.length > 0) {
    params.set("filter", ignoredFiles.map((ignored) => `!${ignored}$`).join(","))
  }

  const branchPath = encodedBranch ? `/${encodedBranch}` : ""
  const configuredApiUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl =
    typeof configuredApiUrl === "string" && configuredApiUrl.length > 0
      ? configuredApiUrl.replace(/\/$/, "")
      : "https://ghloc.ifels.dev"
  const headers = new Headers()
  const authToken = import.meta.env.VITE_AUTH_TOKEN

  if (typeof authToken === "string" && authToken.length > 0) {
    headers.set("Ghloc-Authorization", authToken)
  }

  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${branchPath}?${params}`,
    { headers },
  )
  const data = await response.json()

  if (!response.ok || data.error) {
    throw new Error(data.error || `LOC API request failed (${response.status})`)
  }

  return data as LocData
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
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")
  const ignoredList = Array.isArray(ignoredFiles.ignoredFiles)
    ? (ignoredFiles.ignoredFiles as string[])
    : []
  const data = isPublic
    ? await fetchPublicLoc(org, repo, branch, ignoredList)
    : await fetchLocalLoc(org, repo, branch, ignoredList)

  data.lastFetched = now()
  chrome.storage.local.set({ [makeKey(org, repo, branch)]: data })

  return data
}
