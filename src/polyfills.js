// Polyfills para garantir compatibilidade em produção

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

// Polyfill para Headers se não existir
if (typeof Headers === 'undefined') {
  globalThis.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => {
            this.set(key, value);
          });
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this.set(key, value);
          });
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.set(key, value);
          });
        }
      }
    }

    append(name, value) {
      const existing = this._headers.get(name.toLowerCase());
      if (existing) {
        this._headers.set(name.toLowerCase(), `${existing}, ${value}`);
      } else {
        this._headers.set(name.toLowerCase(), value);
      }
    }

    delete(name) {
      this._headers.delete(name.toLowerCase());
    }

    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }

    has(name) {
      return this._headers.has(name.toLowerCase());
    }

    set(name, value) {
      this._headers.set(name.toLowerCase(), value);
    }

    forEach(callback, thisArg) {
      this._headers.forEach((value, key) => {
        callback.call(thisArg, value, key, this);
      });
    }

    keys() {
      return this._headers.keys();
    }

    values() {
      return this._headers.values();
    }

    entries() {
      return this._headers.entries();
    }

    [Symbol.iterator]() {
      return this._headers.entries();
    }
  };
}

// Garantir que fetch existe (para compatibilidade)
if (typeof fetch === 'undefined') {
  // Implementação básica de fetch usando XMLHttpRequest
  globalThis.fetch = function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = options.method || 'GET';
      
      xhr.open(method, url);
      
      // Configurar headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.onload = () => {
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(),
          text: () => Promise.resolve(xhr.responseText),
          json: () => Promise.resolve(JSON.parse(xhr.responseText))
        };
        
        // Adicionar headers da resposta
        const headerString = xhr.getAllResponseHeaders();
        if (headerString) {
          headerString.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
              response.headers.set(parts[0], parts[1]);
            }
          });
        }
        
        resolve(response);
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Request timeout'));
      
      if (options.timeout) {
        xhr.timeout = options.timeout;
      }
      
      xhr.send(options.body || null);
    });
  };
}

export default {};