# 🚀 Guia de Deploy - DIREITAI

## ✅ Status do Projeto

- ✅ **Código atualizado** no GitHub
- ✅ **DireitaGPT funcionando** com dados reais
- ✅ **GitHub Actions configurado** para deploy automático
- ✅ **Pronto para deploy** na Vercel

---

## 📋 Deploy na Vercel

### 1. 🔗 **Conectar Repositório**

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em **"New Project"**
4. Selecione o repositório: `AUTVSIONAI/DIREITAI`
5. Clique em **"Import"**

### 2. ⚙️ **Configurações de Build**

A Vercel detectará automaticamente:
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3. 🔑 **Variáveis de Ambiente**

Configure as seguintes variáveis no painel da Vercel:

```env
# API Configuration
VITE_API_URL=https://direitai-backend.vercel.app/api

# Supabase Configuration
VITE_SUPABASE_URL=https://vussgslenvyztckeuyap.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZGlyZWl0YWkiLCJhIjoiY21kejNneXVmMDhrZzJpcHkxNDI3a3A1eiJ9.XDUKcah1_a8WQhD8Xyghew

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=[SUA_CHAVE_PUBLICA_STRIPE]

# Environment
NODE_ENV=production
```

### 4. 🚀 **Deploy**

1. Clique em **"Deploy"**
2. Aguarde o build completar
3. ✅ Seu projeto estará online!

---

## 🔄 Deploy Automático com GitHub Actions

### Configuração dos Secrets

No GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

```
VITE_SUPABASE_URL=https://vussgslenvyztckeuyap.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZGlyZWl0YWkiLCJhIjoiY21kejNneXVmMDhrZzJpcHkxNDI3a3A1eiJ9...
VITE_STRIPE_PUBLISHABLE_KEY=[SUA_CHAVE]
VITE_API_URL=https://direitai-backend.vercel.app/api
VERCEL_TOKEN=[SEU_TOKEN_VERCEL]
VERCEL_ORG_ID=[SEU_ORG_ID]
VERCEL_PROJECT_ID=[SEU_PROJECT_ID]
```

### Como obter tokens da Vercel:

1. **VERCEL_TOKEN:**
   - Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Crie um novo token

2. **VERCEL_ORG_ID e VERCEL_PROJECT_ID:**
   - No seu projeto na Vercel, vá em **Settings**
   - Copie os IDs da seção **General**

---

## 📁 Estrutura do Deploy

```
DIREITAI/
├── .github/workflows/deploy.yml  # ✅ GitHub Actions
├── dist/                         # Build output
├── src/                          # Código fonte
├── vite.config.js               # ✅ Configuração Vite
├── package.json                 # Dependências
└── .env.example                 # Template de variáveis
```

---

## 🔧 Funcionalidades Implementadas

- ✅ **DireitaGPT** com dados reais via `/ai/chat`
- ✅ **Fallback local** para respostas quando backend indisponível
- ✅ **Interface azul** personalizada
- ✅ **Integração Supabase** configurada
- ✅ **Build otimizado** para produção
- ✅ **Deploy automático** via GitHub Actions

---

## 🌐 URLs do Projeto

- **Frontend:** `https://seu-projeto.vercel.app`
- **Backend:** `https://direitai-backend.vercel.app`
- **Repositório:** `https://github.com/AUTVSIONAI/DIREITAI`

---

## 🐛 Troubleshooting

### Build Errors
- Verifique se todas as variáveis de ambiente estão configuradas
- Confirme se o `package.json` tem todas as dependências

### Runtime Errors
- Verifique se o backend está online
- Confirme se as chaves do Supabase estão corretas
- Teste as APIs no console do navegador

### Deploy Failures
- Verifique os logs no painel da Vercel
- Confirme se o GitHub Actions tem todos os secrets

---

## 🎯 Próximos Passos

1. ✅ **Deploy realizado** - projeto online
2. 🔧 **Configurar domínio** personalizado (opcional)
3. 📊 **Monitorar performance** via Vercel Analytics
4. 🔄 **Configurar CI/CD** completo com testes

---

**🚀 Seu projeto DIREITAI está pronto para o mundo!**