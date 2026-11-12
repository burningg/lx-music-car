import { repository } from '../../package.json'

// Keep the fork's distribution identity separate from the original author's credit.
export const PROJECT_URL = repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
export const PROJECT_REPOSITORY = PROJECT_URL.replace('https://github.com/', '')
