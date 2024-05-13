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
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  // options_page: 'options.html',
  action: {
    default_popup: 'src/menu/popup.html',
    default_icon: 'img/logo-48.png',
  },
  content_scripts: [
    {
      matches: ['*://github.com/*'],
      js: ['src/stat/index.ts'],
    },
  ],
  permissions: ['storage'],
  host_permissions: ['*://github.com/*'],
})
