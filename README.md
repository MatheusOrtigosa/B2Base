# B2Base

CRM para vendas B2B: empresas, contatos, leads, oportunidades, qualificação com evidências e próximos passos.

## Stack

Next.js, React, TypeScript e Supabase (Postgres + Auth). Hospedagem na Vercel. Node.js 24.

## Colocar no ar

### 1. Preparar o Supabase

1. Abra seu projeto no Supabase e entre em **SQL Editor → New query**.
2. Copie o conteúdo completo de `supabase/migrations/001_initial.sql` e clique em **Run**. Execute uma única vez em um projeto novo. O script roda em uma transação.
3. Em **Authentication → URL Configuration**, configure o **Site URL** com o endereço definitivo da Vercel.
4. Adicione `https://SEU-APP.vercel.app/reset-password` e `https://SEU-APP.vercel.app` às URLs de redirecionamento. Para desenvolvimento local, adicione também `http://localhost:3000` e `http://localhost:3000/reset-password`.
5. A autenticação inicial usa e-mail e senha. Verifique a configuração de confirmação de e-mail. Para um piloto com usuários externos, configure seu provedor SMTP conforme os limites do Supabase.

### 2. Publicar na Vercel

1. Na Vercel, **Add New → Project → Import Git Repository** e selecione `MatheusOrtigosa/B2Base`.
2. Framework: **Next.js**. Root Directory: raiz do repositório. Comando de build: `npm run build`.
3. Configure as variáveis abaixo em Production. Se usar Preview, prefira um projeto Supabase de testes separado para não alterar dados reais.

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qnzanqxnbrduhzaycyjz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sua chave Publishable do projeto |

4. Clique em **Deploy** e configure o endereço gerado no Supabase conforme o passo anterior.
5. Após alterar variáveis de ambiente, faça um novo deploy. As variáveis públicas são incorporadas ao build.

Nunca adicione senha do banco, chave secret ou service_role ao navegador ou ao repositório. Este MVP não precisa delas. O plano Hobby da Vercel é para uso pessoal não comercial; considere um plano adequado ao uso comercial.

### 3. Primeiro acesso

1. Abra a aplicação e clique em **Primeiro acesso? Crie uma conta**.
2. Confirme o e-mail, se habilitado no Supabase, e faça login.
3. Crie o espaço de trabalho da sua empresa.
4. Cadastre uma empresa e contatos; depois um lead e uma oportunidade.
5. Clique na oportunidade para registrar critérios confirmados e as evidências.
6. Crie tarefas e vincule-as à oportunidade.

Sem variáveis configuradas, o aplicativo mostra uma orientação de configuração. Não usa dados falsos como se fossem persistidos.

## Desenvolvimento local

```bash
npm ci
cp .env.example .env.local
# Preencha a chave Publishable em .env.local
npm run dev
```

Abra http://localhost:3000.

```bash
npm test
npm run typecheck
npm run build
```

## Scores

- Lead: 60% aderência + 40% intenção, ambos avaliados manualmente entre 0 e 100.
- Oportunidade: problema/impacto (25), decisor/apoio (20), adequação (20), orçamento (15), prazo/processo (10), próximo passo (10).
- O critério só pontua quando confirmado e com evidência preenchida. Evidências são declarações do usuário, não validações automáticas.
- Score não é probabilidade de fechamento.

## Segurança e isolamento

Todas as tabelas comerciais usam `organization_id` e Row Level Security. O acesso depende de membership autenticada. Referências compostas impedem relacionar um contato, oportunidade ou tarefa a um registro de outra organização. Organizações são criadas por uma função transacional que adiciona o criador como owner. O navegador não pode modificar memberships.

Antes de usar com clientes reais, valide no seu Supabase com duas contas independentes: a conta B não deve ler, editar ou inserir registros da organização A, inclusive acessando a API diretamente. Testes locais validam scores e compilação; não substituem esse teste no banco.

## Limites desta primeira versão

- Cada usuário cria seu espaço; convites e gestão da equipe ainda não têm interface. Não há cadastro público para entrar em uma organização existente.
- Responsável é texto livre, sem atribuição a usuários.
- Conversão automática de lead, mapa visual de influência, exclusão de registros, anexos, auditoria, IA e cobrança ficam para as próximas etapas.
- A listagem inicial carrega todos os registros da organização; adicione paginação antes de volumes maiores.
- Não há personalização dos pesos do score nesta versão.
- Validação no navegador e fluxo real de autenticação/banco devem ser realizados após configurar o projeto.

## Referências

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls
- https://vercel.com/docs/git/vercel-for-github
