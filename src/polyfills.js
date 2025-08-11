// Polyfills removidos temporariamente para debug
// Garantir que globalThis existe
if (typeof globalThis === 'undefined') {
  if (typeof window !== 'undefined') {
    window.globalThis = window;
  } else if (typeof global !== 'undefined') {
    global.globalThis = global;
  } else if (typeof self !== 'undefined') {
    self.globalThis = self;
  }
}

console.log('🔧 Polyfills carregados - Headers nativo:', typeof Headers);
console.log('🔧 Polyfills carregados - fetch nativo:', typeof fetch);

export default {};