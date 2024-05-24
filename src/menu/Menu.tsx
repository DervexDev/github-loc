import { useState, useEffect } from 'preact/hooks'
import './Menu.css'

const DEFAULT_IGNORED_FILES = ['md', 'json', 'yml', 'lock']

export const Menu = () => {
  const [ignoredFiles, setIgnoredFiles] = useState(DEFAULT_IGNORED_FILES.join(', '))
  const [accessToken, setAccessToken] = useState('')
  const [hidden, setHidden] = useState(false)

  function updateIgnoredFiles() {
    chrome.storage.sync.set({
      ignoredFiles: ignoredFiles
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    })
  }

  function updateAccessToken() {
    chrome.storage.sync.set({ accessToken })
  }

  function onClick() {
    if (accessToken.length > 0) {
      setHidden(!hidden)
    } else {
      window.open('https://github.com/settings/tokens/new?scopes=repo&description=GitHub%20LOC')
    }
  }

  useEffect(() => {
    chrome.storage.sync.get('ignoredFiles', (result) => {
      if (Array.isArray(result.ignoredFiles)) {
        setIgnoredFiles(result.ignoredFiles.join(', '))
      }
    })

    chrome.storage.sync.get('accessToken', (result) => {
      if (typeof result.accessToken === 'string') {
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
          placeholder={DEFAULT_IGNORED_FILES.join(', ')}
          onInput={(event) => setIgnoredFiles((event.target as HTMLInputElement)?.value)}
          onFocusOut={updateIgnoredFiles}
        />
      </div>

      <div>
        <h2>Access Token</h2>
        <p>
          GitHub access token enables LOC counting of private repositories and increases rate limits
        </p>
        <div>
          <input
            readOnly={hidden}
            value={hidden ? '•'.repeat(accessToken.length) : accessToken}
            placeholder="ghp..."
            onInput={(event) => setAccessToken((event.target as HTMLInputElement)?.value)}
            onFocusOut={updateAccessToken}
          />
          <button onClick={onClick}>
            <div className="centered">
              {accessToken.length === 0 ? LinkIcon() : hidden ? ShowIcon() : HideIcon()}
            </div>
          </button>
        </div>
      </div>

      <p>
        Made with 💙 by{' '}
        <a href="https://dervex.dev/" target="_blank">
          Dervex
        </a>
      </p>
    </main>
  )
}

function ShowIcon() {
  return (
    <svg viewBox="0 0 32 19.94">
      <path d="M0,9.59c.44-1.24,1.33-2.17,2.17-3.12C4.5,3.86,7.31,1.92,10.66.87c5.1-1.61,9.96-.95,14.54,1.78,2.59,1.54,4.69,3.61,6.38,6.1.53.78.57,1.62.03,2.4-2.82,4.12-6.56,7.02-11.45,8.26-4.53,1.14-8.83.46-12.89-1.81-2.78-1.56-5.04-3.7-6.83-6.33-.19-.28-.3-.61-.44-.92,0-.25,0-.5,0-.75ZM22.72,9.95c0-3.66-3.03-6.71-6.66-6.72-3.78,0-6.79,2.99-6.8,6.76,0,3.65,3.04,6.7,6.71,6.7,3.72,0,6.76-3.02,6.76-6.75Z" />
      <path d="M20.35,9.98c0,2.4-1.99,4.37-4.38,4.35-2.39-.02-4.34-1.98-4.33-4.37,0-2.4,1.99-4.37,4.38-4.35,2.39.02,4.34,1.98,4.34,4.37Z" />
    </svg>
  )
}

function HideIcon() {
  return (
    <svg viewBox="0 0 32 22.82">
      <path d="M0,10.2c.47-1.27,1.39-2.23,2.26-3.22,1.01-1.15,2.16-2.14,3.41-3.02.07-.05.13-.1.21-.17-.61-.61-1.22-1.19-1.81-1.8-.43-.44-.44-1.1-.07-1.57C4.36,0,5.01-.13,5.5.15c.13.08.25.18.36.29,5.55,5.55,11.11,11.1,16.66,16.66,1.2,1.2,2.4,2.4,3.6,3.6.34.34.52.73.41,1.21-.22.91-1.31,1.22-1.99.56-.91-.89-1.8-1.79-2.69-2.7-.14-.14-.25-.16-.43-.1-5.12,1.62-9.99.99-14.59-1.73-2.6-1.53-4.71-3.6-6.4-6.09C.24,11.58.14,11.25,0,10.95c0-.25,0-.5,0-.75ZM9.89,7.83c-1.07,2.11-.85,5.36,1.39,7.56,2.21,2.17,5.42,2.36,7.47,1.3-.59-.59-1.18-1.18-1.77-1.76-.05-.05-.17-.05-.25-.04-.62.09-1.22.07-1.83-.09-2.17-.58-3.49-2.58-3.21-4.88.01-.1.02-.25-.04-.31-.58-.6-1.17-1.18-1.76-1.77Z" />
      <path d="M26.11,17.34c-.48-.48-.94-.94-1.4-1.4-.79-.8-1.59-1.59-2.39-2.38-.13-.13-.18-.23-.1-.43,1.57-4-.71-8.25-4.9-9.15-1.32-.28-2.61-.14-3.86.35-.1.04-.29.05-.35,0-.92-.89-1.82-1.8-2.78-2.76.51-.15.97-.31,1.43-.42,5.95-1.39,11.22.04,15.91,3.85,1.51,1.23,2.79,2.68,3.89,4.29.57.84.58,1.72.01,2.56-1.47,2.16-3.28,3.98-5.46,5.49Z" />
      <path d="M20.24,11.4c-1.7-1.7-3.38-3.38-5.06-5.06.88-.43,2.77.1,3.8,1.05,1.29,1.19,1.59,3.03,1.26,4.01Z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 32 32">
      <path d="M0,8.31c.05-.22.09-.44.14-.67C.71,5.28,2.82,3.58,5.26,3.56c2.37-.02,4.75,0,7.12,0,1.04,0,1.83.77,1.83,1.77,0,.99-.78,1.78-1.82,1.78-2.29.01-4.58.03-6.87,0-1.16-.02-1.98.85-1.98,1.96.03,5.81.01,11.62.01,17.43,0,1.22.72,1.94,1.94,1.94,5.81,0,11.62,0,17.44,0,1.23,0,1.95-.72,1.95-1.93,0-2.29,0-4.58,0-6.87,0-1.18.93-1.99,2.07-1.83.84.12,1.48.86,1.49,1.74,0,1.9.01,3.79,0,5.69,0,.85.02,1.72-.13,2.55-.47,2.44-2.64,4.2-5.13,4.21-5.97.01-11.94.01-17.91,0-2.63,0-4.84-1.97-5.21-4.57,0-.06-.04-.12-.06-.17,0-6.31,0-12.62,0-18.93Z" />
      <path d="M30.56,0s.09.05.14.06c.83.27,1.3.9,1.3,1.78,0,2.81,0,5.62,0,8.44,0,.7,0,1.4,0,2.09,0,1.06-.78,1.86-1.79,1.85-1,0-1.77-.8-1.77-1.84,0-1.96,0-3.92,0-5.87,0-.11,0-.23,0-.42-.14.13-.23.22-.32.31-4.77,4.76-9.53,9.53-14.29,14.3-.53.53-1.14.77-1.87.56-1.23-.34-1.69-1.82-.9-2.81.1-.13.22-.25.34-.36,4.73-4.73,9.46-9.46,14.19-14.18.09-.09.22-.15.33-.23l-.07-.11c-.11,0-.22,0-.33,0-1.98,0-3.96,0-5.94,0-.82,0-1.48-.5-1.72-1.25-.23-.74.04-1.55.69-1.98C18.76.18,19.01.11,19.25,0c3.77,0,7.54,0,11.31,0Z" />
    </svg>
  )
}
