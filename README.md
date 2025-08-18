# DireitaAI Backend

Backend da plataforma DireitaAI - API para conectar conservadores através de eventos, IA e comunidade.

## 🚀 Deploy em Produção

Este repositório contém apenas o backend da aplicação DireitaAI, configurado para deploy na Vercel.

### Frontend
O frontend está em um repositório separado: [DIREITAI](https://github.com/AUTVSIONAI/DIREITAI)

## 📋 Variáveis de Ambiente

Configure as seguintes variáveis de ambiente na Vercel:

```env
# Backend Configuration
PORT=5120
NODE_ENV=production
FRONTEND_URL=https://direitai.vercel.app

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key_here
TOGETHER_API_KEY=your_together_api_key_here

# Payment Services
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Vercel Configuration
VERCEL=1
```

## 🔗 APIs Externas

### APIs Públicas (Não precisam de chaves)
- **Câmara dos Deputados**: `https://dadosabertos.camara.leg.br/api/v2`
- **Senado Federal**: `https://legis.senado.leg.br/dadosabertos`

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Supabase** - Banco de dados e autenticação
- **Stripe** - Processamento de pagamentos
- **OpenRouter/Together** - Serviços de IA
- **Vercel** - Plataforma de deploy

## 📁 Estrutura do Projeto

```
├── api/                    # Serverless functions para Vercel
├── config/                 # Configurações (Supabase, etc.)
├── middleware/             # Middlewares (auth, etc.)
├── routes/                 # Rotas da API
├── services/               # Serviços (IA, etc.)
├── server.js              # Servidor principal
├── vercel.json            # Configuração da Vercel
└── package.json           # Dependências e scripts
```

## 🚀 Deploy na Vercel

1. **Conectar Repositório**
   - Acesse [Vercel Dashboard](https://vercel.com/dashboard)
   - Clique em "New Project"
   - Conecte este repositório

2. **Configurar Variáveis de Ambiente**
   - Na página do projeto, vá em "Settings" > "Environment Variables"
   - Adicione todas as variáveis listadas acima

3. **Deploy**
   - O deploy será automático após conectar o repositório
   - A URL será algo como: `https://direitai-backend.vercel.app`

## 🔍 Endpoints Principais

- `GET /` - Informações da API
- `GET /health` - Health check
- `POST /api/auth/*` - Autenticação
- `GET /api/politicians` - Lista de políticos
- `POST /api/ai/chat` - Chat com IA
- `GET /api/events` - Eventos
- `POST /api/payments/*` - Pagamentos

## 🐛 Troubleshooting

### Problemas Comuns

1. **CORS Error**
   - Verificar se o domínio do frontend está na lista de origens permitidas
   - Arquivo: `server.js` (linha ~17)

2. **Database Connection Error**
   - Verificar variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
   - Testar conexão em `/health`

3. **AI Services Error**
   - Verificar chaves `OPENROUTER_API_KEY` e `TOGETHER_API_KEY`
   - Verificar saldo das contas

4. **Payment Error**
   - Verificar chaves `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
   - Verificar configuração de webhooks no Stripe

### Logs
- **Vercel**: Dashboard > Functions > View Function Logs
- **Supabase**: Dashboard > Logs

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/AUTVSIONAI/DIREITAI-backend/issues)
- **Documentação**: [Vercel Docs](https://vercel.com/docs)
- **Supabase**: [Supabase Docs](https://supabase.com/docs)

---

**Desenvolvido pela Equipe DireitaAI** 🇧🇷