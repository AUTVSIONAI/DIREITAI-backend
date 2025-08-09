# DireitaAI 🇧🇷

**Plataforma completa para engajamento político conservador com inteligência artificial**

DireitaAI é uma plataforma inovadora que combina eventos presenciais, gamificação, inteligência artificial e e-commerce para criar uma comunidade engajada de conservadores brasileiros.

## 🚀 Funcionalidades Principais

### 👥 **Sistema de Usuários**
- Registro e autenticação segura
- Perfis personalizáveis com informações políticas
- Sistema de pontos e conquistas
- Planos: Gratuito, Engajado e Premium

### 📅 **Eventos Políticos**
- Criação e gerenciamento de eventos
- Check-in com código secreto
- Sistema de pontuação por participação
- Mapa ao vivo de eventos ativos

### 🤖 **Inteligência Artificial**
- **DireitaGPT**: Chatbot especializado em política conservadora
- **Creative AI**: Geração de conteúdo político (posts, memes, discursos)
- Limites baseados no plano do usuário
- Histórico de conversas e gerações

### 🛒 **Loja Integrada**
- Produtos conservadores (livros, camisetas, acessórios)
- Carrinho de compras
- Sistema de pedidos
- Gestão de estoque

### 🏆 **Gamificação**
- Sistema de pontos por atividades
- Conquistas e badges
- Rankings por cidade/estado
- Recompensas por engajamento

### 👨‍💼 **Painel Administrativo**
- Dashboard com métricas em tempo real
- Gerenciamento de usuários e eventos
- Moderação de conteúdo
- Relatórios financeiros
- Configurações do sistema

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- **React 18** - Interface de usuário moderna
- **Vite** - Build tool rápido
- **Tailwind CSS** - Estilização utilitária
- **Lucide React** - Ícones
- **React Router** - Navegação

### **Backend**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **OpenRouter** - API de IA

### **Infraestrutura**
- **Supabase** - Hospedagem do banco
- **Vercel/Netlify** - Deploy do frontend
- **Railway/Heroku** - Deploy do backend

## 📦 Instalação e Configuração

### **Pré-requisitos**
- Node.js 16+ 
- npm 8+
- Conta no Supabase
- Conta no OpenRouter (opcional)

### **Configuração Rápida**

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/direitaai.git
cd direitaai
```

2. **Execute o script de configuração**
```bash
cd backend
npm run setup
```

3. **Ou configure manualmente:**

```bash
# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ..
npm install

# Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite o arquivo .env com suas credenciais

# Configurar banco de dados
cd backend
npm run db:setup
```

### **Variáveis de Ambiente**

Crie o arquivo `backend/.env` com:

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=seu_jwt_secret_muito_seguro

# IA (Opcional)
OPENROUTER_API_KEY=sua_chave_openrouter

# Geolocalização (Opcional)
GEOLOCATION_API_KEY=sua_chave_geo
```

## 🚀 Executando o Projeto

### **Desenvolvimento**

```bash
# Iniciar backend (porta 3001)
cd backend
npm run dev

# Em outro terminal, iniciar frontend (porta 5173)
cd ..
npm run dev
```

### **Ou usar o script automático:**

```bash
node backend/scripts/start-dev.js
```

### **URLs de Desenvolvimento**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## 📊 Estrutura do Projeto

```
direitaai/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── admin/               # Componentes administrativos
│   │   ├── auth/                # Autenticação
│   │   └── user/                # Interface do usuário
│   ├── contexts/                # Contextos React
│   ├── lib/                     # Utilitários
│   └── main.jsx                 # Entrada da aplicação
├── backend/                      # Backend Node.js
│   ├── routes/                  # Rotas da API
│   ├── middleware/              # Middlewares
│   ├── utils/                   # Utilitários
│   ├── database/                # Schema e seeds
│   ├── scripts/                 # Scripts de desenvolvimento
│   └── server.js                # Servidor principal
├── package.json                 # Dependências do frontend
└── README.md                    # Este arquivo
```

## 🔧 Scripts Disponíveis

### **Frontend**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Linting do código
```

### **Backend**
```bash
npm run dev          # Servidor com nodemon
npm run start        # Servidor de produção
npm run setup        # Configuração inicial
npm run db:setup     # Configurar banco
npm run db:clean     # Limpar dados de teste
npm run health       # Verificar saúde do servidor
npm run logs         # Ver logs em tempo real
```

## 🗄️ Banco de Dados

### **Principais Tabelas**
- `users` - Usuários e perfis
- `events` - Eventos políticos
- `checkins` - Check-ins em eventos
- `ai_conversations` - Conversas com IA
- `ai_generations` - Conteúdo gerado por IA
- `products` - Produtos da loja
- `orders` - Pedidos
- `user_achievements` - Conquistas dos usuários

### **Comandos Úteis**
```bash
# Recriar schema (CUIDADO: apaga dados)
npm run db:setup:force

# Ver ajuda do banco
npm run db:help

# Limpar apenas dados de teste
npm run db:clean
```

## 🔐 Autenticação e Segurança

- **JWT** para autenticação de usuários
- **Row Level Security (RLS)** no Supabase
- **Middleware de autenticação** em rotas protegidas
- **Validação de dados** com Joi
- **Rate limiting** em APIs sensíveis
- **Sanitização** de inputs do usuário

## 🤖 Integração com IA

### **DireitaGPT**
- Chat especializado em política conservadora
- Respostas baseadas em valores tradicionais
- Limites por plano de usuário

### **Creative AI**
- Geração de posts para redes sociais
- Criação de memes políticos
- Scripts para vídeos
- Discursos e textos

### **Configuração da IA**
1. Crie conta no [OpenRouter](https://openrouter.ai)
2. Obtenha sua API key
3. Configure no arquivo `.env`
4. Ajuste prompts em `backend/routes/ai.js`

## 📱 Planos de Usuário

### **🆓 Gratuito**
- 10 conversas IA/dia
- Check-in em eventos
- Loja básica
- Perfil simples

### **⭐ Engajado (R$ 19,90/mês)**
- 50 conversas IA/dia
- 20 gerações criativas/dia
- Eventos exclusivos
- Badge especial
- Suporte prioritário

### **👑 Premium (R$ 39,90/mês)**
- IA ilimitada
- Gerações ilimitadas
- Acesso antecipado
- Eventos VIP
- Consultoria política
- Badge premium

## 🎯 Roadmap

### **Versão 1.1**
- [ ] App mobile (React Native)
- [ ] Notificações push
- [ ] Streaming de eventos
- [ ] Chat entre usuários

### **Versão 1.2**
- [ ] Integração com redes sociais
- [ ] Sistema de afiliados
- [ ] Marketplace de terceiros
- [ ] Analytics avançados

### **Versão 2.0**
- [ ] IA de análise política
- [ ] Predições eleitorais
- [ ] Sistema de doações
- [ ] Plataforma de candidatos

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### **Padrões de Código**
- Use ESLint e Prettier
- Siga convenções de nomenclatura
- Documente funções complexas
- Escreva testes para novas features
- Mantenha commits atômicos

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### **Problemas Comuns**

**Erro de conexão com Supabase:**
- Verifique as credenciais no `.env`
- Confirme se o projeto Supabase está ativo
- Teste a conexão: `npm run health`

**IA não funciona:**
- Verifique a chave do OpenRouter
- Confirme se há créditos na conta
- Veja logs: `npm run logs`

**Erro de CORS:**
- Configure domínios permitidos no Supabase
- Verifique configuração de CORS no backend

### **Contato**
- 📧 Email: suporte@direitaai.com.br
- 💬 Discord: [DireitaAI Community](https://discord.gg/direitaai)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/direitaai/issues)

## 🙏 Agradecimentos

- Comunidade conservadora brasileira
- Contribuidores do projeto
- Supabase pela infraestrutura
- OpenRouter pela API de IA
- Todos que acreditam em valores tradicionais

---

**Feito com ❤️ para o Brasil conservador**

*"A liberdade não é negociável"*