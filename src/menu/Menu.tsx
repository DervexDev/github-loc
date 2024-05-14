import { useState, useEffect } from 'preact/hooks'
import './Menu.css'

const DEFAULT_IGNORED_FILES = ['md', 'json', 'yml', 'lock']

export const Menu = () => {
  const [ignoredFiles, setIgnoredFiles] = useState(DEFAULT_IGNORED_FILES.join(', '))
  const [accessToken, setAccessToken] = useState('')

  function updateIgnoredFiles() {
    chrome.storage.sync.set({ ignoredFiles: ignoredFiles.split(',').map((s) => s.trim()) })
  }

  function updateAccessToken() {
    chrome.storage.sync.set({ accessToken })
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
      }
    })
  }, [])

  return (
    <main>
      <div className="heading">
        <h1>GitHub LOC</h1>
        <img className="logo" src="/logo-128.png" width={48} alt="GitHub LOC logo" />
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
            value={accessToken}
            placeholder="ghp..."
            onInput={(event) => setAccessToken((event.target as HTMLInputElement)?.value)}
            onFocusOut={updateAccessToken}
          />
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub%20LOC"
            target="_blank"
          >
            <button>+</button>
          </a>
        </div>
      </div>

      <p>
        Made with ❤️ by{' '}
        <a href="https://dervex.dev/" target="_blank">
          Dervex
        </a>
      </p>
    </main>
  )
}

export default Menu
