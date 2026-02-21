import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// mind-ar v1.2.5 imports deprecated three.js exports (sRGBEncoding, LinearEncoding)
// that were removed in three v0.150+. this plugin patches those imports.
function mindARCompat(): Plugin {
  return {
    name: 'mindar-three-compat',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('mindar-image-three.prod')) return

      let patched = code

      const srgbMatch = code.match(/sRGBEncoding\s+as\s+(\w+)/)
      if (srgbMatch) {
        patched = patched.replace(/,\s*sRGBEncoding\s+as\s+\w+/, '')
        patched = `const ${srgbMatch[1]} = 3001;\n` + patched
      }

      const linearMatch = code.match(/LinearEncoding\s+as\s+(\w+)/)
      if (linearMatch) {
        patched = patched.replace(/,\s*LinearEncoding\s+as\s+\w+/, '')
        patched = `const ${linearMatch[1]} = 3000;\n` + patched
      }

      return { code: patched, map: null }
    },
  }
}

export default defineConfig({
  plugins: [mindARCompat(), react()],
  server: {
    allowedHosts: ['.ngrok-free.dev'],
  },
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
})
