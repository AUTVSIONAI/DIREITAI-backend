require('dotenv').config();
const axios = require('axios');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Cliente HTTP simples para Supabase REST API
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  from(table) {
    return {
      select: async (columns = '*') => {
        try {
          const response = await axios.get(`${this.url}/rest/v1/${table}?select=${columns}`, {
            headers: this.headers
          });
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      insert: async (data) => {
        try {
          const response = await axios.post(`${this.url}/rest/v1/${table}`, data, {
            headers: this.headers
          });
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      update: async (data) => {
        try {
          const response = await axios.patch(`${this.url}/rest/v1/${table}`, data, {
            headers: this.headers
          });
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      },
      delete: async () => {
        try {
          const response = await axios.delete(`${this.url}/rest/v1/${table}`, {
            headers: this.headers
          });
          return { data: response.data, error: null };
        } catch (error) {
          return { data: null, error: error.response?.data || error.message };
        }
      }
    };
  }

  rpc(functionName, params = {}) {
    return axios.post(`${this.url}/rest/v1/rpc/${functionName}`, params, {
      headers: this.headers
    }).then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error: error.response?.data || error.message }));
  }

  get auth() {
    return {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null })
    };
  }
}

const supabase = new SupabaseClient(supabaseUrl, supabaseKey);
console.log('✅ Cliente HTTP Supabase configurado com sucesso');

module.exports = { supabase };