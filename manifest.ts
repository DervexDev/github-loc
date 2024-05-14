import { defineManifest } from '@crxjs/vite-plugin'
import packageData from './package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'logo-16.png',
    32: 'logo-32.png',
    48: 'logo-48.png',
    128: 'logo-128.png',
  },
  options_page: 'src/menu/index.html',
  action: {
    default_popup: 'src/menu/index.html',
    default_icon: 'logo-48.png',
  },
  content_scripts: [
    {
      matches: ['*://github.com/*'],
      js: ['src/stat/index.ts'],
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        'public/logo-16.png',
        'public/logo-32.png',
        'public/logo-48.png',
        'public/logo-128.png',
      ],
      matches: [],
    },
  ],
  permissions: ['storage'],
  host_permissions: ['*://github.com/*'],
})
