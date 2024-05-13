export default async function fetchLoc(org: string, repo: string) {
  return await fetch(`https://ghloc.ifels.dev/${org}/${repo}`).then((res) => res.json())
}
