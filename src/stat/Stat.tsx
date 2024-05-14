interface Props {
  org: string
  repo: string
}

export default function Stat({ org, repo }: Props) {
  return (
    <a className="Link Link--muted" href={`https://ghloc.vercel.app/${org}/${repo}`}>
      <svg
        className="octicon octicon-repo-forked mr-2"
        viewBox="0 0 16 16"
        aria-hidden={true}
        height={16}
        width={16}
      >
        <path d="M5.75,13.29L8.89,2.32L10.23,2.71L7.08,13.67Z" />
        <path d="M2.06,8l2.27-2.27c.27-.27.27-.71,0-.98-.27-.27-.71-.27-.98,0L.59,7.5c-.14.14-.2.32-.2.5,0,.18.07.36.2.5l2.76,2.76c.27.27.71.27.98,0h0c.27-.27.27-.71,0-.98l-2.27-2.27Z" />
        <path d="M13.94,8l-2.27-2.27c-.27-.27-.27-.71,0-.98.27-.27.71-.27.98,0l2.76,2.76c.14.14.2.32.2.5,0,.18-.07.36-.2.5l-2.76,2.76c-.27.27-.71.27-.98,0h0c-.27-.27-.27-.71,0-.98l2.27-2.27Z" />
      </svg>{' '}
      <strong>0</strong> lines of code
    </a>
  )
}
