export interface RepoInfo {
  description: string | null
  homepage: string | null
  topics?: string[]
  size: number
  stargazers_count: number
  forks: number
  subscribers_count: number
  archived: boolean
  fork: boolean
}

export async function fetchRepo(owner: string, repo: string): Promise<RepoInfo | null> {
  try {
    const stored = await chrome.storage.sync.get("accessToken")
    const headers = new Headers({
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    })

    if (typeof stored.accessToken === "string" && stored.accessToken.length > 0) {
      headers.set("Authorization", `Bearer ${stored.accessToken}`)
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
    if (!response.ok) {
      return null
    }

    return (await response.json()) as RepoInfo
  } catch {
    return null
  }
}
