import type { Context } from 'hono'
import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'

function getHermesDir(): string {
  if (process.env.HERMES_HOME) return resolve(process.env.HERMES_HOME)
  return resolve(homedir(), '.hermes')
}

async function safeReadFile(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf-8') } catch { return null }
}

function extractDescription(md: string): string {
  const lines = md.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) {
      const title = trimmed.replace(/^#+\s*/, '').trim()
      if (title) return title
    }
    if (trimmed.length > 5) return trimmed.slice(0, 120)
  }
  return ''
}

async function listFilesRecursive(dir: string, prefix: string): Promise<{ path: string; name: string; isDir: boolean }[]> {
  const results: { path: string; name: string; isDir: boolean }[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        results.push({ path: relPath, name: entry.name, isDir: true })
        results.push(...await listFilesRecursive(join(dir, entry.name), relPath))
      } else {
        results.push({ path: relPath, name: entry.name, isDir: false })
      }
    }
  } catch { /* ignore */ }
  return results
}

function getSkillSource(dirName: string, bundled: Set<string>, hub: Set<string>): 'builtin' | 'hub' | 'local' {
  if (bundled.has(dirName)) return 'builtin'
  if (hub.has(dirName)) return 'hub'
  return 'local'
}

function readBundledManifest(content: string | null): Set<string> {
  const set = new Set<string>()
  if (!content) return set
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const name = trimmed.slice(0, idx).trim()
    if (name) set.add(name)
  }
  return set
}

function readHubInstalled(content: string | null): Set<string> {
  if (!content) return new Set()
  try {
    const data = JSON.parse(content)
    if (data?.installed && typeof data.installed === 'object') {
      return new Set(Object.keys(data.installed))
    }
  } catch { /* ignore */ }
  return new Set()
}

function readUsageStats(content: string | null): Map<string, { patch_count: number; use_count: number; view_count: number; pinned: boolean }> {
  const map = new Map()
  if (!content) return map
  try {
    const data = JSON.parse(content)
    for (const [name, stats] of Object.entries(data)) {
      const s = stats as any
      map.set(name, { patch_count: s.patch_count ?? 0, use_count: s.use_count ?? 0, view_count: s.view_count ?? 0, pinned: !!s.pinned })
    }
  } catch { /* ignore */ }
  return map
}

function readConfigDisabled(skillsDir: string): string[] {
  try {
    const configPath = join(skillsDir, '..', 'config.yaml')
    const content = readFileSync(configPath, 'utf-8')
    const match = content.match(/disabled:\s*\n((\s+-\s+[^\n]+\n)+)/)
    if (match) {
      return match[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().slice(1).trim())
    }
  } catch { /* ignore */ }
  return []
}

export async function listSkills(c: Context) {
  const hermesDir = getHermesDir()
  const skillsDir = join(hermesDir, 'skills')

  try {
    const disabledList = readConfigDisabled(skillsDir)
    const bundledManifest = readBundledManifest(await safeReadFile(join(skillsDir, '.bundled_manifest')))
    const hubNames = readHubInstalled(await safeReadFile(join(skillsDir, '.hub', 'lock.json')))
    const usageStats = readUsageStats(await safeReadFile(join(skillsDir, '.usage.json')))

    // Scan
    const allEntries = await readdir(skillsDir, { withFileTypes: true }).catch(() => [] as import('fs').Dirent[])
    const dirNames = allEntries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name)

    const categories: any[] = []
    const flatSkills: any[] = []

    for (const dirName of dirNames) {
      const catDir = join(skillsDir, dirName)
      const hasDesc = await safeReadFile(join(catDir, 'DESCRIPTION.md'))
      const hasSkillMd = await safeReadFile(join(catDir, 'SKILL.md'))
      const subEntries = await readdir(catDir, { withFileTypes: true }).catch(() => [] as import('fs').Dirent[])
      const subDirs = subEntries.filter(se => se.isDirectory() && !se.name.startsWith('.'))

      if (hasSkillMd) {
        flatSkills.push({ name: dirName, skillMd: hasSkillMd, source: getSkillSource(dirName, bundledManifest, hubNames) })
      } else if (hasDesc || subDirs.length > 0) {
        const desc = hasDesc ? hasDesc.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 100) : ''
        const skills: any[] = []
        for (const se of subDirs) {
          const skillMd = await safeReadFile(join(catDir, se.name, 'SKILL.md'))
          if (skillMd) {
            const source = getSkillSource(se.name, bundledManifest, hubNames)
            const usage = usageStats.get(se.name)
            skills.push({
              name: se.name,
              description: extractDescription(skillMd),
              enabled: !disabledList.includes(se.name),
              source,
              patchCount: usage?.patch_count,
              useCount: usage?.use_count,
              viewCount: usage?.view_count,
              pinned: usage?.pinned || undefined,
            })
          }
        }
        if (skills.length > 0) {
          categories.push({ name: dirName, description: desc, skills: skills.sort((a, b) => a.name.localeCompare(b.name)) })
        }
      }
    }

    if (flatSkills.length > 0) {
      const miscSkills = flatSkills.map(fs => {
        const usage = usageStats.get(fs.name)
        return {
          name: fs.name,
          description: extractDescription(fs.skillMd),
          enabled: !disabledList.includes(fs.name),
          source: fs.source,
          patchCount: usage?.patch_count,
          useCount: usage?.use_count,
          viewCount: usage?.view_count,
          pinned: usage?.pinned || undefined,
        }
      }).sort((a, b) => a.name.localeCompare(b.name))
      categories.push({ name: 'misc', description: '', skills: miscSkills })
    }

    categories.sort((a, b) => a.name.localeCompare(b.name))

    // Archived
    const archived: any[] = []
    const archiveDir = join(skillsDir, '.archive')
    const archiveEntries = await readdir(archiveDir, { withFileTypes: true }).catch(() => [] as import('fs').Dirent[])
    for (const entry of archiveEntries) {
      if (!entry.isDirectory()) continue
      const skillMd = await safeReadFile(join(archiveDir, entry.name, 'SKILL.md'))
      if (skillMd) {
        const usage = usageStats.get(entry.name)
        archived.push({
          name: entry.name,
          description: extractDescription(skillMd),
          source: getSkillSource(entry.name, bundledManifest, hubNames),
          patchCount: usage?.patch_count,
          useCount: usage?.use_count,
          viewCount: usage?.view_count,
          pinned: usage?.pinned || undefined,
        })
      }
    }
    archived.sort((a: any, b: any) => a.name.localeCompare(b.name))

    return c.json({ categories, archived })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
}

export async function readSkillFile(c: Context) {
  const hermesDir = getHermesDir()
  const filePath = c.req.param('*') ?? ''
  let realPath = filePath
  if (realPath.startsWith('misc/')) realPath = realPath.slice(5)
  const fullPath = resolve(join(hermesDir, 'skills', realPath))
  if (!fullPath.startsWith(join(hermesDir, 'skills'))) {
    return c.json({ error: 'Access denied' }, 403)
  }
  const content = await safeReadFile(fullPath)
  if (content === null) return c.json({ error: 'File not found' }, 404)
  return c.json({ content })
}

export async function listSkillFiles(c: Context) {
  const hermesDir = getHermesDir()
  const category = c.req.param('category') ?? ''
  const skill = c.req.param('skill') ?? ''
  const realDir = category === 'misc' ? skill : join(category, skill)
  const skillDir = join(hermesDir, 'skills', realDir)
  try {
    const allFiles = await listFilesRecursive(skillDir, '')
    const files = allFiles.filter(f => f.path !== 'SKILL.md')
    return c.json({ files })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
}

export async function toggleSkill(c: Context) {
  const body = await c.req.json<{ name?: string; enabled?: boolean }>()
  if (!body.name || typeof body.enabled !== 'boolean') {
    return c.json({ error: 'Missing name or enabled flag' }, 400)
  }
  // TODO: implement config.yaml mutation
  return c.json({ success: true })
}

export async function pinSkill(c: Context) {
  const body = await c.req.json<{ name?: string; pinned?: boolean }>()
  if (!body.name || typeof body.pinned !== 'boolean') {
    return c.json({ error: 'Missing name or pinned flag' }, 400)
  }
  // TODO: integrate with hermes CLI
  return c.json({ success: true })
}
