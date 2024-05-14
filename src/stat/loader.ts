interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
}

export function loadLoc(org: string, repo: string): Promise<number> {
  return new Promise((resolve) => {
    const key = org + '/' + repo

    chrome.storage.local.get(key, (result) => {
      if (typeof result[key] === 'number') {
        resolve(result[key])
      }
    })
  })
}

export async function fetchLoc(org: string, repo: string): Promise<number> {
  const headers: { Authorization?: string } = {}
  const accessToken = await chrome.storage.sync.get('accessToken')

  if (typeof accessToken.accessToken === 'string') {
    headers.Authorization = `Bearer ${accessToken.accessToken}`
  }

  const data: LocData = await fetch(`https://ghloc.ifels.dev/${org}/${repo}`, { headers })
    .then((res) => res.json())
    .then((data) => {
      if (typeof data !== 'object') {
        throw new Error('Invalid response: ' + JSON.stringify(data))
      }

      return data
    })

  const ignoredFiles = await chrome.storage.sync.get('ignoredFiles')
  let totalLoc = 0

  if (Array.isArray(ignoredFiles.ignoredFiles)) {
    for (let [lang, loc] of Object.entries(data.locByLangs)) {
      for (const ignored of ignoredFiles.ignoredFiles) {
        if (lang.endsWith(ignored.toLowerCase())) {
          loc = 0
          break
        }
      }

      totalLoc += loc
    }
  } else {
    totalLoc = data.loc
  }

  chrome.storage.local.set({ [org + '/' + repo]: totalLoc })
  return totalLoc
}
