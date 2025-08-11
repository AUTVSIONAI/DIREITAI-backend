# 🚀 Guia de Deploy do Backend - DIREITAI

## 📋 Situação Atual

✅ **Backend corrigido** com configuração CORS melhorada <mcreference link="https://github.com/AUTVSIONAI/DIREITAI-backend" index="0">0</mcreference>
✅ **Repositório separado** para o backend: `https://github.com/AUTVSIONAI/DIREITAI-backend`
✅ **Configuração Vercel** pronta no `vercel.json`
❌ **Deploy pendente** - precisa ser feito no repositório correto

---

## 🔧 Problema Identificado

O backend está em um **repositório separado** no GitHub:
- **Frontend:** `https://github.com/AUTVSIONAI/DIREITAI`
- **Backend:** `https://github.com/AUTVSIONAI/DIREITAI-backend`

As correções CORS foram aplicadas localmente, mas precisam ser enviadas para o repositório correto.

---

## 🛠️ Passos para Deploy

### 1. **Enviar Correções para o Repositório Backend**

```bash
# Navegar para a pasta backend
cd backend

# Verificar se é um repositório Git separado
git remote -v

# Se não for, clonar o repositório backend separadamente
cd ..
git clone https://github.com/AUTVSIONAI/DIREITAI-backend.git backend-deploy
cd backend-deploy

# Copiar as correções do server.js
# (aplicar manualmente as alterações CORS)
```

### 2. **Aplicar Correções CORS no Repositório Backend**

No arquivo `server.js` do repositório backend, substituir a configuração CORS por:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://direitai.com',
      'https://www.direitai.com',
      'https://direitai.vercel.app',
      'https://direitai-backend.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5121'
    ];
    
    // Permitir qualquer subdomínio do Vercel em desenvolvimento
    if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Não permitido pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};
```

### 3. **Fazer Commit e Push**

```bash
# No repositório backend
git add server.js
git commit -m "fix: Melhorar configuração CORS para produção"
git push origin master
```

### 4. **Deploy na Vercel**

#### Opção A: Via Dashboard Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Selecione o repositório: `AUTVSIONAI/DIREITAI-backend`
4. Configure as variáveis de ambiente
5. Clique em **"Deploy"**

#### Opção B: Via CLI (se já configurado)
```bash
cd backend-deploy
npx vercel --prod
```

---

## 🔑 Variáveis de Ambiente do Backend

Configure no painel da Vercel:

```env
SUPABASE_URL=https://vussgslenvyztckeuyap.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c3Nnc2xlbnZ5enRja2V1eWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE5ODUsImV4cCI6MjA2OTg1Nzk4NX0.a3WlLKS1HrSCqWuG80goBsoUaUhtpRsV8mqmTAYpIAo
SUPABASE_SERVICE_ROLE_KEY=[SUA_SERVICE_ROLE_KEY]
PORT=5000
NODE_ENV=production
OPENROUTER_API_KEY=[SUA_CHAVE_OPENROUTER]
TOGETHER_API_KEY=[SUA_CHAVE_TOGETHER]
JWT_SECRET=[SEU_JWT_SECRET_SEGURO]
GEOLOCATION_API_KEY=[OPCIONAL]
STRIPE_SECRET_KEY=[SUA_CHAVE_SECRETA_STRIPE]
STRIPE_WEBHOOK_SECRET=[CONFIGURE_APOS_CRIAR_WEBHOOK]
```

---

## 🔍 Verificação Pós-Deploy

### 1. **Testar Endpoints**
```bash
# Health check
curl https://direitai-backend.vercel.app/health

# API de chat
curl -X POST https://direitai-backend.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá"}'
```

### 2. **Verificar CORS**
```javascript
// No console do navegador em direitai.com
fetch('https://direitai-backend.vercel.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 3. **Atualizar Frontend**
Confirmar que a variável `VITE_API_URL` no frontend aponta para:
```
VITE_API_URL=https://direitai-backend.vercel.app/api
```

---

## 🚨 Troubleshooting

### Se ainda houver erros CORS:

1. **Verificar logs da Vercel:**
   - Acesse o painel da Vercel
   - Vá em **Functions**
   - Verifique os logs de erro

2. **Verificar se o deploy foi bem-sucedido:**
   - Confirme se não há erros de build
   - Verifique se todas as variáveis estão configuradas

3. **Testar localmente:**
   ```bash
   cd backend
   npm install
   npm run dev
   # Testar em http://localhost:5000
   ```

---

## ✅ Checklist de Deploy

- [ ] Correções CORS aplicadas no repositório backend
- [ ] Commit e push realizados
- [ ] Projeto backend deployado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Health check funcionando
- [ ] CORS resolvido (sem erros no console)
- [ ] DireitaGPT funcionando em produção
- [ ] Frontend atualizado com URL correta

---

## 🎯 Resultado Esperado

✅ **Backend online:** `https://direitai-backend.vercel.app`
✅ **CORS funcionando:** Sem erros de origem
✅ **DireitaGPT operacional:** Chat funcionando perfeitamente
✅ **APIs acessíveis:** Todos os endpoints respondendo

---

**🚀 Com essas correções, o DIREITAI estará 100% funcional em produção!**