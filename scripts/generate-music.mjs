import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { parseFile } from 'music-metadata'

const root = process.cwd()
const musicDir = join(root, 'public', 'music')
const coverDir = join(musicDir, '.generated')
const output = join(root, 'src', 'music.generated.js')
await mkdir(coverDir, { recursive: true })

const files = (await readdir(musicDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && ['.mp3', '.m4a', '.ogg', '.wav', '.flac'].includes(extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)

const tracks = []
for (const [index, file] of files.entries()) {
  const fullPath = join(musicDir, file)
  const metadata = await parseFile(fullPath)
  const picture = metadata.common.picture?.[0]
  let cover = ''
  if (picture) {
    const extension = picture.format.includes('png') ? 'png' : picture.format.includes('webp') ? 'webp' : 'jpg'
    const coverName = `cover-${index}.${extension}`
    await writeFile(join(coverDir, coverName), picture.data)
    cover = `/music/.generated/${coverName}`
  }
  const url = `/${relative(join(root, 'public'), fullPath).replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/')}`
  tracks.push({
    src: url,
    title: metadata.common.title || file.replace(extname(file), ''),
    artist: metadata.common.artist || metadata.common.albumartist || 'Unknown artist',
    album: metadata.common.album || '',
    cover,
  })
}

await writeFile(output, `// Generated from public/music — do not edit by hand.\nexport const tracks = ${JSON.stringify(tracks, null, 2)}\n`)
console.log(`Generated ${tracks.length} music track(s).`)
