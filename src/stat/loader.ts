export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
}

function makeKey(org: string, repo: string, branch: string) {
  return org + '/' + repo + '/' + branch
}

export function loadLoc(org: string, repo: string, branch: string): Promise<number> {
  return new Promise((resolve) => {
    const key = makeKey(org, repo, branch)

    chrome.storage.local.get(key, (result) => {
      if (typeof result[key] === 'number') {
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
  const accessToken = await chrome.storage.sync.get('accessToken')
  const headers = new Headers()

  if (typeof accessToken.accessToken === 'string' && accessToken.accessToken.length > 0) {
    headers.append('Authorization', `Bearer ${accessToken.accessToken}`)
  }

  let data: LocData = await fetch(`https://ghloc-api.vercel.app/${org}/${repo}/${branch}`, {
    headers: headers,
  })
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
          delete data.locByLangs[lang]
          loc = 0

          break
        }
      }

      totalLoc += loc
    }
  } else {
    totalLoc = data.loc
  }

  chrome.storage.local.set({ [makeKey(org, repo, branch)]: totalLoc })
  return [totalLoc, data]
}
