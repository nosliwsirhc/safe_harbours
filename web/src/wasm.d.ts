// The Cloudflare adapter turns `*.wasm?module` imports into a WebAssembly.Module
// (bundled into the Worker; not fetched at runtime).
declare module '*.wasm?module' {
  const mod: WebAssembly.Module;
  export default mod;
}
