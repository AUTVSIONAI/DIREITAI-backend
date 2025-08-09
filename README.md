# DIREITAI - Frontend

Um aplicativo web moderno para serviços jurídicos com IA integrada.

## 🚀 Deploy no Vercel

Este projeto está configurado para deploy automático no Vercel. Para fazer o deploy:

1. **Conecte seu repositório ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com sua conta GitHub
   - Clique em "New Project"
   - Selecione este repositório: `AUTVSIONAI/DIREITAI`

2. **Configuração automática:**
   - O Vercel detectará automaticamente que é um projeto Vite/React
   - As configurações de build serão aplicadas automaticamente:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Variáveis de ambiente:**
   - Configure as seguintes variáveis no painel do Vercel:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   VITE_MAPBOX_TOKEN=seu_token_do_mapbox
   VITE_STRIPE_PUBLISHABLE_KEY=sua_chave_publica_do_stripe
   ```

4. **Deploy:**
   - Clique em "Deploy"
   - O Vercel fará o build e deploy automaticamente
   - Cada push para a branch `master` acionará um novo deploy

## 🛠️ Desenvolvimento Local

1. Clone o repositório:
```bash
git clone https://github.com/AUTVSIONAI/DIREITAI.git
cd DIREITAI
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

4. Execute o projeto:
```bash
npm run dev
```

## 📁 Estrutura do Projeto

- `/src` - Código fonte da aplicação
- `/src/components` - Componentes React reutilizáveis
- `/src/pages` - Páginas da aplicação
- `/src/services` - Serviços de API
- `/src/contexts` - Contextos React (Auth, Theme, etc.)
- `/src/hooks` - Hooks customizados
- `/src/types` - Definições de tipos TypeScript

## 🔧 Tecnologias

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase
- **Mapas:** Mapbox
- **Pagamentos:** Stripe
- **Deploy:** Vercel

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria o build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter
- `npm run test` - Executa os testes

## 🌐 Links

- **Frontend:** [DIREITAI](https://github.com/AUTVSIONAI/DIREITAI)
- **Backend:** [DIREITAI Backend](https://github.com/AUTVSIONAI/DIREITAI-backend)

---

**Nota:** Certifique-se de configurar corretamente todas as variáveis de ambiente antes do deploy em produção.