export default function loadLoc(org: string, repo: string) {
  chrome.storage.local.get(org + '/' + repo, (data) => {
    console.log(data)
  })
}
