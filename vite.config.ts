import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

const TRUE = 'true'

const root = resolve(__dirname)
const outDir = resolve(__dirname, 'chatgpt-wizard')

export default ({ mode, command }: { mode: string, command: string }) => {
    const ENV = loadEnv(mode, process.cwd()) // load (dev || prod) .env
    // vite config
    return defineConfig({
        resolve: {
            alias: {
                '@/': '/',
            },
        },
        define: {
            'process.env': ENV,
        },
        build: {
            outDir,
            sourcemap: ENV.VITE_BUILD_SOURCEMAP === TRUE,
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: ENV.VITE_BUILD_DROP_CONSOLE === TRUE, // disable console
                    drop_debugger: ENV.VITE_BUILD_DROP_DEBUGGER === TRUE, // disable debug
                },
            },
            rollupOptions: {
                input: {
                    content_scripts: resolve(root, 'src/content_scripts', 'index.ts'),
                    background: resolve(root, 'src/background', 'index.ts'),
                    utils: resolve(root, 'src/utils', 'index.ts'),
                    popup: resolve(root, 'src/popup', 'index.html')
                },
                output: {
                    entryFileNames: chunk => {
                        return `${chunk.name}/index.js`;
                    },
                },
                
            },
        },
    })
}
