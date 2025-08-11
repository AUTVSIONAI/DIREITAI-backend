# 🔧 Correção de Problemas CORS - DIREITAI

## ❌ Problema Identificado

O frontend em produção (`https://direitai.com`) está tentando acessar URLs incorretas:
- ❌ `https://seu-backend-vercel-url.vercel.app/api` (URL placeholder)
- ✅ `https://direitai-backend.vercel.app/api` (URL correta)

## 🛠️ Correções Implementadas

### 1. **Backend - Configuração CORS Melhorada**
- ✅ Configuração dinâmica de CORS
- ✅ Suporte a subdomínios Vercel
- ✅ Headers adicionais permitidos
- ✅ Métodos HTTP completos

### 2. **Frontend - URLs Corrigidas**
- ✅ DEPLOY.md atualizado com URL correta
- ✅ VERCEL_DEPLOYMENT_GUIDE.md corrigido
- ✅ Configuração de fallback no código

## 🚀 Próximos Passos

### 1. **Deploy do Backend**
```bash
cd backend
git add .
git commit -m "fix: Melhorar configuração CORS para produção"
git push origin master
```

### 2. **Verificar Variáveis na Vercel**
No painel da Vercel do **frontend**, confirme:
```
VITE_API_URL=https://direitai-backend.vercel.app/api
```

### 3. **Redeploy do Frontend**
- Acesse o painel da Vercel
- Vá em **Deployments**
- Clique em **Redeploy** no último deployment

## 🔍 Verificação

### URLs Corretas:
- **Frontend:** `https://direitai.com`
- **Backend:** `https://direitai-backend.vercel.app`
- **API Base:** `https://direitai-backend.vercel.app/api`

### Endpoints para Testar:
- `GET https://direitai-backend.vercel.app/health`
- `POST https://direitai-backend.vercel.app/api/ai/chat`
- `GET https://direitai-backend.vercel.app/api/users/profile`

## 🐛 Troubleshooting

### Se ainda houver erros CORS:

1. **Verificar se o backend está online:**
   ```
   curl https://direitai-backend.vercel.app/health
   ```

2. **Verificar logs da Vercel:**
   - Acesse o painel da Vercel
   - Vá em **Functions**
   - Verifique os logs de erro

3. **Verificar variáveis de ambiente:**
   - Frontend: `VITE_API_URL`
   - Backend: Todas as chaves do Supabase, OpenRouter, etc.

### Comandos de Debug:

```javascript
// No console do navegador
console.log('API URL:', import.meta.env.VITE_API_URL);

// Testar endpoint diretamente
fetch('https://direitai-backend.vercel.app/health')
  .then(r => r.json())
  .then(console.log);
```

## ✅ Checklist de Resolução

- [ ] Backend deployado com nova configuração CORS
- [ ] Frontend com variável `VITE_API_URL` correta
- [ ] Redeploy do frontend realizado
- [ ] Teste de endpoints funcionando
- [ ] DireitaGPT funcionando em produção
- [ ] Sem erros CORS no console

---

**🎯 Objetivo:** Eliminar completamente os erros CORS e fazer o DireitaGPT funcionar perfeitamente em produção.