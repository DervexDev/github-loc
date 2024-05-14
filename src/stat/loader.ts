export async function loadLoc(org: string, repo: string): Promise<number> {
  return new Promise((resolve) => {
    const key = org + '/' + repo

    chrome.storage.local.get(key, (data) => {
      if (data[key]) {
        resolve(data[key])
      }
    })
  })
}

export async function fetchLoc(org: string, repo: string): Promise<number> {
  return await fetch(`https://ghloc.ifels.dev/${org}/${repo}`)
    .then((res) => res.json())
    .then((data) => {
      chrome.storage.local.set({ [org + '/' + repo]: data.loc })

      return data.loc
    })
}
