export interface DeployFile { path: string; content: string }

/**
 * Patch package.json to ensure CSS toolchain packages (tailwindcss, autoprefixer,
 * postcss) are present in devDependencies whenever postcss.config.* or
 * tailwind.config.* is included. AI-generated code frequently omits these.
 */
export function sanitiseFiles(files: DeployFile[]): DeployFile[] {
  const hasPostcss = files.some(f =>
    f.path === 'postcss.config.js' ||
    f.path === 'postcss.config.cjs' ||
    f.path === 'postcss.config.mjs',
  )
  const hasTailwind = files.some(f => f.path.startsWith('tailwind.config'))
  if (!hasPostcss && !hasTailwind) return files

  const pkgIndex = files.findIndex(f => f.path === 'package.json')
  if (pkgIndex === -1) return files

  let pkg: Record<string, unknown>
  try { pkg = JSON.parse(files[pkgIndex].content) } catch { return files }

  const dev = (pkg.devDependencies ?? {}) as Record<string, string>
  let patched = false
  if (!dev['tailwindcss'])   { dev['tailwindcss']   = '^3.4.1';   patched = true }
  if (!dev['autoprefixer'])  { dev['autoprefixer']  = '^10.4.20'; patched = true }
  if (!dev['postcss'])       { dev['postcss']       = '^8.4.47';  patched = true }
  if (!patched) return files

  pkg.devDependencies = dev
  const updated = [...files]
  updated[pkgIndex] = { ...files[pkgIndex], content: JSON.stringify(pkg, null, 2) }
  return updated
}
