export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
}

function makeKey(org: string, repo: string, branch: string) {
  return org + '/' + repo + '/' + branch
}

async function sha1(str: string) {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-1', encoder.encode(str))

  return Array.from(new Uint8Array(hash))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
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
  let url = `https://ghloc-api.vercel.app/${org}/${repo}/${branch}`

  const accessToken = await chrome.storage.sync.get('accessToken')
  const headers = new Headers({
    'Ghloc-Authorization': import.meta.env.VITE_AUTH_TOKEN,
  })

  if (typeof accessToken.accessToken === 'string' && accessToken.accessToken.length > 0) {
    headers.append('Authorization', `Bearer ${accessToken.accessToken}`)

    url += '?salt=' + (await sha1(accessToken.accessToken))
  }

  let data: LocData = await fetch(url, {
    headers,
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
