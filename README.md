# B2Base

CRM para vendas B2B: empresas, contatos, leads, oportunidades, qualificação com evidências e próximos passos.

## Stack

Next.js, React, TypeScript e Supabase (Postgres + Auth). Hospedagem na Vercel. Node.js 24.

## Colocar no ar

### 1. Preparar o Supabase

1. Abra seu projeto no Supabase e entre em **SQL Editor → New query**.
2. Em um projeto novo, execute `supabase/migrations/001_initial.sql` e depois `supabase/migrations/002_team_collaboration.sql`, uma única vez cada. Se o MVP inicial já está funcionando, execute **somente 002_team_collaboration.sql**. Os scripts rodam em transações e a migração 002 preserva os registros existentes.
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

## Colaboração (MVP 0.2)

1. Execute a migração 002 se ainda não aplicada. Sem ela, os cadastros continuam funcionando e a aba Equipe permanece indisponível.
2. Atualize a aplicação usando o domínio fixo do projeto na Vercel. URLs de deploy antigo continuam servindo a versão antiga. Não use o endereço com hash de uma publicação anterior para testar a nova versão.
3. Na aba **Equipe**, o administrador informa o e-mail de um colega e cria um convite de 7 dias. O convite pode ser cancelado enquanto pendente.
4. Copie o endereço do app e compartilhe com o colega. O B2Base não envia e-mails de convite nesta etapa.
5. O colega cria uma conta ou entra com o e-mail convidado. Se criar, precisa confirmar o e-mail. O convite aparece no primeiro acesso; não é necessário criar outra empresa. Se já tem uma empresa, pode atualizar a aba Equipe para buscar novos convites.
6. Após aceitar, ambos veem os mesmos registros. Pessoas com várias empresas podem alternar no seletor do espaço de trabalho.
7. Ao criar/editar uma oportunidade ou tarefa, escolha um membro no campo Responsável. No banco, uma chave estrangeira impede atribuir usuários externos à equipe.

### Validação manual antes do piloto

Use duas contas e sessões separadas (janela normal e anônima):

- A cria uma oportunidade privada; B cria uma empresa independente. B não deve ver os registros de A.
- A convida o e-mail confirmado de B. Antes de aceitar, B continua sem acesso.
- B aceita e passa a ver a empresa A no seletor, com os mesmos registros.
- A atribui uma oportunidade e uma tarefa a B. Atualize as duas sessões e confira a persistência.
- B não consegue criar/cancelar convites. Para isso é preciso ser administrador.
- Para manter um usuário independente para novos testes de isolamento, use uma terceira conta que não foi convidada.

## Scores

- Lead: 60% aderência + 40% intenção, ambos avaliados manualmente entre 0 e 100.
- Oportunidade: problema/impacto (25), decisor/apoio (20), adequação (20), orçamento (15), prazo/processo (10), próximo passo (10).
- O critério só pontua quando confirmado e com evidência preenchida. Evidências são declarações do usuário, não validações automáticas.
- Score não é probabilidade de fechamento.

## Segurança e isolamento

Todas as tabelas comerciais usam `organization_id` e Row Level Security. O acesso depende de membership autenticada. Referências compostas impedem relacionar um contato, oportunidade ou tarefa a um registro de outra organização. Organizações são criadas por uma função transacional que adiciona o criador como owner. O navegador não pode modificar memberships.

Antes de usar com clientes reais, valide no seu Supabase com duas contas independentes: a conta B não deve ler, editar ou inserir registros da organização A, inclusive acessando a API diretamente. Testes locais executam as migrações reais em PostgreSQL embarcado (PGlite), com um esquema mínimo que simula as identidades do Supabase. Validam isolamento, convites, permissões e responsáveis. Não substituem o teste do login e dos convites no Supabase hospedado.

## Limites desta primeira versão

- Convites por e-mail são criados na aba Equipe e aceitos dentro do app com conta de e-mail confirmado; não há envio automático de e-mail. O administrador deve compartilhar o endereço do app.
- Membros podem editar os registros comerciais da própria empresa; não há perfis de acesso granular, remoção de membros nem transferência de administração nesta etapa.
- Responsáveis agora são membros reais selecionados da equipe. Nomes antigos permanecem legíveis até serem substituídos por uma atribuição a usuário.
- Conversão automática de lead, mapa visual de influência, exclusão de registros, anexos, auditoria, IA e cobrança ficam para as próximas etapas.
- A listagem inicial carrega todos os registros da organização; adicione paginação antes de volumes maiores.
- Não há personalização dos pesos do score nesta versão.
- Validação no navegador e fluxo real de autenticação/banco devem ser realizados após configurar o projeto.

## Referências

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls
- https://vercel.com/docs/git/vercel-for-github
