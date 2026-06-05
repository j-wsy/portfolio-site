import { execSync } from 'node:child_process'
import { rmSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root })
}

// 1. Clean
rmSync(resolve(root, 'docs'), { recursive: true, force: true })

// 2. Build eleventy site into docs/
run('pnpm --filter site build')

// 3. Build volleyvision into docs/volleyvision/
run('pnpm --filter volleyvision build')

// 4. Copy CNAME so the custom domain survives the deploy
copyFileSync(resolve(root, 'cname.txt'), resolve(root, 'docs', 'CNAME'))
