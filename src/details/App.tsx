import { ComponentChildren, Fragment } from "preact"
import { useEffect, useMemo, useRef, useState } from "preact/hooks"
import { fetchLoc, LocData, Locs, LocsChild, watchLoc } from "../stat/loader"
import { loadMatchFilter } from "../stat/util"
import { formatBytes, formatNumber, humanize, removeProtocol } from "./format"
import { fetchRepo, RepoInfo } from "./github"
import { SortOrder, filterTree, getLocsValue, getNodeAtPath, isFolder, sortChildren } from "./tree"

interface Props {
  org: string
  repo: string
  branch: string
}

function useDebouncedFilter(value: string | null, delay: number): string | null {
  const [debounced, setDebounced] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    if (value === null) {
      previous.current = null
      setDebounced(null)
      return
    }

    if (previous.current === null) {
      previous.current = value
      setDebounced(value)
      return
    }

    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function StarIcon() {
  return (
    <svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
        clip-rule="evenodd"
      />
    </svg>
  )
}

function GitForkIcon() {
  return (
    <svg class="icon-sm" viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path
        fill-rule="evenodd"
        d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path
        fill-rule="evenodd"
        d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
        clip-rule="evenodd"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M11.999 1C5.926 1 1 5.925 1 12c0 4.86 3.152 8.983 7.523 10.437c.55.102.75-.238.75-.53c0-.26-.009-.952-.014-1.87c-3.06.664-3.706-1.475-3.706-1.475c-.5-1.27-1.221-1.61-1.221-1.61c-.999-.681.075-.668.075-.668c1.105.078 1.685 1.134 1.685 1.134c.981 1.68 2.575 1.195 3.202.914c.1-.71.384-1.195.698-1.47c-2.442-.278-5.01-1.222-5.01-5.437c0-1.2.428-2.183 1.132-2.952c-.114-.278-.491-1.397.108-2.91c0 0 .923-.297 3.025 1.127A10.5 10.5 0 0 1 12 6.32a10.5 10.5 0 0 1 2.754.37c2.1-1.424 3.022-1.128 3.022-1.128c.6 1.514.223 2.633.11 2.911c.705.769 1.13 1.751 1.13 2.952c0 4.226-2.572 5.156-5.022 5.428c.395.34.747 1.01.747 2.037c0 1.47-.014 2.657-.014 3.017c0 .295.199.637.756.53C19.851 20.979 23 16.859 23 12c0-6.075-4.926-11-11.001-11"
      />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg class="icon-sm shrink" viewBox="0 0 24 24" fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3h8.25a.75.75 0 0 1 0 1.5H5.25Z"
        clip-rule="evenodd"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg class="icon folder" viewBox="0 0 24 24" fill="currentColor" stroke-width="2">
      <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg class="icon file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function QuestionMarkCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg class="spinner" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z" />
    </svg>
  )
}

function Badge({
  mode = "outline",
  title,
  children,
}: {
  mode?: "outline" | "accent"
  title?: string
  children: ComponentChildren
}) {
  return (
    <div class={cn("badge", mode)} title={title}>
      {children}
    </div>
  )
}

function RepoStats({
  watchers,
  stars,
  forks,
}: {
  watchers?: number
  stars?: number
  forks?: number
}) {
  return (
    <div class="repo-stats">
      {watchers ? (
        <div class="repo-stat" title="Watchers">
          <EyeIcon />
          <span> {humanize(watchers)}</span>
        </div>
      ) : null}
      {stars ? (
        <div class="repo-stat" title="Stars">
          <StarIcon />
          <span> {humanize(stars)}</span>
        </div>
      ) : null}
      {forks ? (
        <div class="repo-stat" title="Forks">
          <GitForkIcon />
          <span> {humanize(forks)}</span>
        </div>
      ) : null}
    </div>
  )
}

function InfoSection({ org, repo, data }: { org: string; repo: string; data: RepoInfo | null }) {
  return (
    <>
      <div class="info-row">
        <div class="repo-title">
          <a
            class="github-link"
            href={`https://github.com/${org}/${repo}`}
            target="_blank"
            rel="noopener"
            title="Open repo on GitHub"
          >
            <GitHubIcon />
          </a>
          <a class="link" href={`https://github.com/${org}`} target="_blank" rel="noopener">
            {org}
          </a>
          {" / "}
          <a class="link" href={`https://github.com/${org}/${repo}`} target="_blank" rel="noopener">
            {repo}
          </a>
        </div>

        {data ? (
          <>
            <div class="info-badges">
              {data.archived ? <Badge title="Repo is archived">Archived</Badge> : null}
              {data.fork ? <Badge title="Repo is a fork">Fork</Badge> : null}
              <Badge title="Repo size">{formatBytes(data.size * 1024, 0)}</Badge>
            </div>
            <RepoStats
              watchers={data.subscribers_count}
              stars={data.stargazers_count}
              forks={data.forks}
            />
          </>
        ) : null}
      </div>

      {data?.topics && data.topics.length !== 0 ? (
        <div class="topics">
          {data.topics.map((topic) => (
            <Badge key={topic} mode="accent">
              {topic}
            </Badge>
          ))}
        </div>
      ) : null}

      {data && (data.description || data.homepage) ? (
        <div class="info-copy">
          {data.description ? <p>{data.description}</p> : null}
          {data.homepage ? (
            <a class="homepage" href={data.homepage} target="_blank" rel="noopener">
              <ExternalLinkIcon />
              <span class="truncate">{removeProtocol(data.homepage)}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function PathBreadcrumbs({
  path,
  onSelect,
}: {
  path: string[]
  onSelect: (index: number) => void
}) {
  return (
    <div class="breadcrumb">
      {path.map((name, index) => {
        const isLast = index + 1 === path.length
        return (
          <span key={index}>
            <button
              type="button"
              class={isLast ? "current" : undefined}
              disabled={isLast}
              onClick={() => onSelect(index)}
            >
              {name}
            </button>{" "}
            {!isLast ? <span>/</span> : null}{" "}
          </span>
        )
      })}
    </div>
  )
}

function FilterHelpTooltip() {
  return (
    <div class="help">
      <button type="button" class="help-button" aria-label="Show filter syntax help">
        <QuestionMarkCircleIcon />
      </button>
      <div class="help-panel">
        <h3>Filter syntax examples</h3>
        <ul>
          <li>
            <code>.js</code> will only include paths containing <code>.js</code>.
          </li>
          <li>
            <code>.js$</code> will only include files with <code>.js</code> extension.
          </li>
          <li>
            <code>!test,!.lock</code> will ignore paths containing <code>test</code> or{" "}
            <code>.lock</code>.
          </li>
          <li>
            <code>!.test.js$,!^docs/</code> will ignore paths ending with <code>.test.js</code> or
            starting with <code>docs/</code>.
          </li>
          <li>
            <code>!.md$,^README.md$</code> will ignore all Markdown files (i.e. ending with{" "}
            <code>.md</code>) except for <code>README.md</code> in the root of the repository.
          </li>
          <li>
            <code>^src/</code> will exclude all paths, except for the ones starting with{" "}
            <code>src/</code> (i.e. placed in the <code>src</code> folder).
          </li>
        </ul>
        <p>
          See{" "}
          <a
            class="link"
            href="https://github.com/subtle-byte/ghloc#readme"
            target="_blank"
            rel="noopener"
          >
            ghloc
          </a>{" "}
          for details.
        </p>
      </div>
    </div>
  )
}

function renderLoc(loc: number, total: number) {
  const percent = total === 0 ? "0.0" : ((100 * loc) / total).toFixed(1)
  return `${formatNumber(loc)} (${percent}%)`
}

function FileTree({
  locs,
  selectedLanguage,
  onSelectDir,
}: {
  locs: Locs
  selectedLanguage: string | null
  onSelectDir: (name: string) => void
}) {
  const entries = Object.entries(locs.children ?? {})
  const total = entries.reduce((sum, [, child]) => sum + getLocsValue(child), 0)
  const selectedTotal = selectedLanguage ? locs.locByLangs[selectedLanguage] || 0 : 0

  function highlight(name: string, child: LocsChild) {
    if (!selectedLanguage || !selectedTotal) {
      return 0
    }
    if (isFolder(child)) {
      return ((child.locByLangs[selectedLanguage] || 0) / selectedTotal) * 100
    }
    return name.endsWith(selectedLanguage) ? (getLocsValue(child) / selectedTotal) * 100 : 0
  }

  return (
    <ul class={cn("panel files", entries.length === 0 && "empty")}>
      {entries.map(([name, child]) => (
        <li key={name} style={{ backgroundSize: `${highlight(name, child)}%` }}>
          <button
            type="button"
            disabled={!isFolder(child)}
            onClick={() => onSelectDir(name)}
            title={name}
          >
            {isFolder(child) ? <FolderIcon /> : <DocumentIcon />}
            <span class="name">{name}</span>
            <span class="stat">{renderLoc(getLocsValue(child), total)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function LocsTree({
  locs,
  selectedLanguage,
  onSelectLanguage,
}: {
  locs: Locs
  selectedLanguage: string | null
  onSelectLanguage: (lang: string | null) => void
}) {
  const entries = Object.entries(locs.locByLangs).sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
  )
  const total = entries.reduce((sum, [, loc]) => sum + loc, 0)

  return (
    <ul class={cn("panel langs", entries.length === 0 && "empty")}>
      {entries.map(([name, loc]) => (
        <li key={name}>
          <button
            type="button"
            class={selectedLanguage === name ? "selected" : ""}
            onClick={() => onSelectLanguage(selectedLanguage === name ? null : name)}
            title={name}
          >
            <span class="name">{name}</span>
            <span class="stat">{renderLoc(loc, total)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function App({ org, repo, branch }: Props) {
  const [data, setData] = useState<LocData | null>(null)
  const [ready, setReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>("type")
  const [path, setPath] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const debouncedFilter = useDebouncedFilter(filter, 750)

  useEffect(() => {
    document.title = org && repo ? `${org}/${repo}` : "GitHub LOC"
  }, [org, repo])

  useEffect(() => {
    loadMatchFilter().then(setFilter)
  }, [])

  useEffect(() => {
    if (!org || !repo) {
      return
    }

    fetchRepo(org, repo).then(setRepoInfo)
  }, [org, repo])

  useEffect(() => {
    if (!org || !repo) {
      setReady(true)
      return
    }

    return watchLoc(org, repo, branch, (next) => {
      setData(next)
      setReady(true)
    })
  }, [org, repo, branch])

  useEffect(() => {
    if (!org || !repo) {
      return
    }

    let cancelled = false
    setRefreshing(true)
    fetchLoc(org, repo, branch)
      .catch((error) => {
        console.log("Failed to refresh LOC:", error)
      })
      .finally(() => {
        if (!cancelled) {
          setRefreshing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [org, repo, branch])

  const locs = useMemo(() => {
    if (!data || debouncedFilter === null) {
      return null
    }

    const filtered = filterTree(data, debouncedFilter)
    const node = getNodeAtPath(filtered, path)
    if (!node) {
      return sortChildren({ loc: 0, locByLangs: {}, children: {} }, sortOrder)
    }

    return sortChildren(node, sortOrder)
  }, [data, debouncedFilter, path, sortOrder])

  if (!org || !repo) {
    return <div class="status">Missing repository.</div>
  }

  return (
    <main class="page">
      <div class="stack">
        <InfoSection org={org} repo={repo} data={repoInfo} />

        <div class="stack">
          <div class="toolbar">
            <PathBreadcrumbs
              path={[repo, ...path]}
              onSelect={(index) => setPath(index === 0 ? [] : path.slice(0, index))}
            />
            <div class="controls">
              <div class="select">
                <select
                  value={sortOrder}
                  title="Sort order"
                  onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)}
                >
                  <option value="type">Type</option>
                  <option value="locs">Locs</option>
                </select>
                <ChevronDownIcon />
              </div>
              <div class="filter-wrap">
                <div class="filter">
                  <input
                    value={filter ?? ""}
                    size={1}
                    placeholder="Filter"
                    onInput={(event) => setFilter((event.target as HTMLInputElement).value)}
                  />
                  {refreshing && locs ? <SpinnerIcon /> : <FilterHelpTooltip />}
                </div>
              </div>
            </div>
          </div>

          {!ready || debouncedFilter === null || !data || !locs ? (
            <div class="status inner">
              {!ready || debouncedFilter === null
                ? "Loading..."
                : "No LOC data is cached for this repository yet. Go back to GitHub and wait for the count to finish."}
            </div>
          ) : (
            <div class="grid">
              <section>
                <h2>Files</h2>
                <FileTree
                  locs={locs}
                  selectedLanguage={selectedLanguage}
                  onSelectDir={(name) => setPath((current) => [...current, name])}
                />
              </section>
              <section>
                <h2>Lines of code ({formatNumber(locs.loc)})</h2>
                <LocsTree
                  locs={locs}
                  selectedLanguage={selectedLanguage}
                  onSelectLanguage={setSelectedLanguage}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
