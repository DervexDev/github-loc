import { useState, useEffect } from "preact/hooks"
import { ShowIcon, HideIcon, LinkIcon, SaveIcon, OkIcon, BadIcon } from "./Icons"
import { DEFAULT_IGNORED_FILES } from "../defaults"
import "./Menu.css"

const IGNORED_FILES_REGEX = /^(\w+ ?, ?)*\w*$/

export const Menu = () => {
  const [savedIgnoredFiles, setSavedIgnoredFiles] = useState(DEFAULT_IGNORED_FILES.join(", "))
  const [ignoredFiles, setIgnoredFiles] = useState(DEFAULT_IGNORED_FILES.join(", "))
  const [isClickable, setIsClickable] = useState(false)

  const [savedAccessToken, setSavedAccessToken] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [hidden, setHidden] = useState(false)

  function ignoredFilesAction() {
    if (IGNORED_FILES_REGEX.test(ignoredFiles)) {
      chrome.storage.sync.set({
        ignoredFiles: ignoredFiles
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      })

      setSavedIgnoredFiles(ignoredFiles)
    }
  }

  function accessTokenAction() {
    if (accessToken.length === 0) {
      if (savedAccessToken.length > 0) {
        chrome.storage.sync.remove("accessToken")
        setSavedAccessToken("")
      } else {
        window.open("https://github.com/settings/tokens/new?scopes=repo&description=GitHub%20LOC")
      }
    } else if (accessToken !== savedAccessToken) {
      fetch("https://api.github.com/user/issues", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (res.status === 200) {
            chrome.storage.sync.set({ accessToken })
            setSavedAccessToken(accessToken)
            setHidden(true)
          } else {
            chrome.storage.sync.remove("accessToken")
            setSavedAccessToken("")
            setAccessToken("")
          }
        })
        .catch(() => {
          chrome.storage.sync.set({ accessToken })
          setSavedAccessToken(accessToken)
          setHidden(true)
        })
    } else {
      setHidden(!hidden)
    }
  }

  function getIgnoredFilesIcon() {
    if (IGNORED_FILES_REGEX.test(ignoredFiles)) {
      if (ignoredFiles.replace(/[, ]/g, "") === savedIgnoredFiles.replace(/[, ]/g, "")) {
        setIsClickable(false)
        return OkIcon()
      } else {
        setIsClickable(true)
        return SaveIcon()
      }
    } else {
      setIsClickable(false)
      return BadIcon()
    }
  }

  function getAccessTokenIcon() {
    if (accessToken.length === 0) {
      if (savedAccessToken.length > 0) {
        return SaveIcon()
      } else {
        return LinkIcon()
      }
    } else if (accessToken !== savedAccessToken) {
      return SaveIcon()
    } else if (hidden) {
      return ShowIcon()
    } else {
      return HideIcon()
    }
  }

  useEffect(() => {
    chrome.storage.sync.get("ignoredFiles", (result) => {
      if (Array.isArray(result.ignoredFiles)) {
        setSavedIgnoredFiles(result.ignoredFiles.join(", "))
        setIgnoredFiles(result.ignoredFiles.join(", "))
      }
    })

    chrome.storage.sync.get("accessToken", (result) => {
      if (typeof result.accessToken === "string" && result.accessToken.length > 0) {
        setSavedAccessToken(result.accessToken)
        setAccessToken(result.accessToken)
        setHidden(true)
      }
    })
  }, [])

  return (
    <main>
      <div className="centered">
        <h1>GitHub LOC</h1>
        <img className="logo" src="/img/logo-128.png" width={48} alt="GitHub LOC logo" />
      </div>

      <a href="https://github.com/DervexDev/github-loc" target="_blank">
        <img src="https://img.shields.io/github/stars/DervexDev/github-loc" alt="GitHub stars" />
      </a>

      <div>
        <h2>Ignored Files</h2>
        <p>
          A list of file extensions that should be excluded from the total repository LOC
          calculation
        </p>
        <input
          value={ignoredFiles}
          placeholder={DEFAULT_IGNORED_FILES.slice(0, 4).join(", ") + "..."}
          onInput={(event) => setIgnoredFiles((event.target as HTMLInputElement)?.value)}
        />
        <button
          onClick={ignoredFilesAction}
          disabled={!isClickable}
          class={isClickable ? "" : "noHover"}
        >
          <div className="centered">{getIgnoredFilesIcon()}</div>
        </button>
      </div>

      <div>
        <h2>Access Token</h2>
        <p>
          GitHub access token enables LOC counting of private repositories and increases rate limits
        </p>
        <div>
          <input
            readOnly={hidden}
            value={hidden ? "•".repeat(accessToken.length) : accessToken}
            placeholder="ghp..."
            onInput={(event) => setAccessToken((event.target as HTMLInputElement)?.value)}
          />
          <button onClick={accessTokenAction}>
            <div className="centered">{getAccessTokenIcon()}</div>
          </button>
        </div>
      </div>

      <p>
        Made with 💙 by{" "}
        <a href="https://dervex.dev/" target="_blank">
          Dervex
        </a>
      </p>
    </main>
  )
}
