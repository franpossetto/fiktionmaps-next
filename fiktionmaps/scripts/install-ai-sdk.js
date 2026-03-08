const { execSync } = require('child_process')

console.log('Installing ai and @ai-sdk/react...')
execSync('pnpm add ai@^6.0.0 @ai-sdk/react@^3.0.0', { stdio: 'inherit', cwd: '/vercel/share/v0-project' })
console.log('Done.')
