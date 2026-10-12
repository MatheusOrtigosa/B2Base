# B2Base

CRM para vendas B2B: empresas e contatos com contexto e saúde de relacionamento, histórico de interações, leads, oportunidades, qualificação com evidências e próximos passos.

## Stack

Next.js, React, TypeScript e Supabase (Postgres + Auth). Hospedagem na Vercel. Node.js 24.

## Colocar no ar

### 1. Preparar o Supabase

1. Abra seu projeto no Supabase e entre em **SQL Editor → New query**.
2. Em um projeto novo, execute `supabase/migrations/001_initial.sql`, depois `supabase/migrations/002_team_collaboration.sql` e `supabase/migrations/003_relationship_hub.sql`, uma única vez cada. Se o MVP inicial já está funcionando, execute **somente 002_team_collaboration.sql**. Os scripts rodam em transações e a migração 002 preserva os registros existentes.
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

## Empresas e contatos (MVP 0.3)

Se o banco já está configurado, execute **somente `003_relationship_hub.sql`** no SQL Editor. Esta migração funciona com ou sem a 002 e preserva os registros existentes. A migração 001 continua sendo pré-requisito. Não execute novamente migrações já aplicadas.

### Cadastros ampliados

| Empresa | Contato |
| --- | --- |
| Nome, razão social, CNPJ/identificação fiscal | Nome, empresa, cargo, área |
| Ramo, porte, descrição, produtos/serviços | E-mail, telefone, WhatsApp, LinkedIn |
| Site, telefone, e-mail institucional | Canal de comunicação preferido |
| Cidade, estado/região, país | Papel na compra e influência |
| Tipo de conta e aderência ao cliente ideal | Prioridades, interesses e observações |
| Desafios, objetivos estratégicos | Avaliação e contexto do relacionamento |
| Avaliação e contexto do relacionamento | Histórico de interações e acompanhamentos |

O nome é obrigatório. Os outros campos podem ser enriquecidos progressivamente; desconhecimento aparece no painel, sem bloquear o cadastro. A identificação fiscal é armazenada como texto, sem validação oficial ou consulta externa.

### Saúde explicável, independente de oportunidades

Clique no nome ou em **Ver histórico** na lista de Empresas/Contatos. O painel mostra:

- **Relacionamento:** avaliação manual, com contexto. A comunicação mais recente com resultado “Ponto de atenção” sinaliza atenção no painel.
- **Conhecimento do cadastro:** completo, parcial (até duas lacunas) ou a enriquecer. Cada painel explica quais informações faltam.
- **Contato e engajamento:** conversa até 30 dias é ativa; 31–60 dias sugere retomar; acima de 60 dias é distante. Notas e tentativas sem resposta não contam como conversa. Duas tentativas sem resposta nos últimos 30 dias, sem conversa posterior, indicam “Sem retorno”.
- **Aderência/influência:** avaliação manual da aderência da empresa ao cliente ideal ou influência do contato na compra.
- **Próximos passos:** acompanhamentos planejados, atrasados ou sem ação pendente. Prazo é avaliado na data de São Paulo.

A saúde geral não é uma probabilidade de venda. “Saudável” requer relacionamento avaliado como saudável e conversa recente; sinais de atenção geram “Atenção”, e falta de contexto gera “A conhecer”. Uma aderência baixa é um sinal de qualificação comercial e não transforma, sozinha, um relacionamento em ruim. Limiares ainda são fixos nesta versão.

### Histórico de relacionamento

Registre ligação, reunião, e-mail, WhatsApp, nota ou outro evento. Informe data/hora, assunto, contexto, resultado e, opcionalmente, prazo e descrição do próximo passo. Pode concluir ou reabrir o acompanhamento na própria grade.

Eventos não precisam estar vinculados a uma oportunidade. São registros manuais: não fazem chamadas, enviam mensagens nem sincronizam agendas externas. A interação deve ter ocorrido; ações futuras são registradas como próximos passos.

O histórico da empresa reúne seus eventos diretos e os eventos dos contatos ligados a ela no momento do registro. Essa empresa é registrada no banco na criação do evento e permanece no histórico se o contato mudar de empresa. O histórico pode ser filtrado por tipo e é ordenado pela data da interação. A interface inicial carrega até 1.000 eventos recentes por organização; paginação e cargas incrementais ficam para a evolução de volume.

Interações são preservadas: apenas o estado de conclusão do acompanhamento é editável nesta etapa. Para corrigir contexto de uma interação, registre uma nova nota. Usuários de fora da organização não podem ler ou registrar eventos nela. O criador do evento é validado no banco.

### Teste rápido

1. Enriquecer a empresa e o contato já cadastrados.
2. Abrir o contato e registrar uma ligação realizada, com observações e próximo passo.
3. Conferir o evento no histórico do contato e no histórico da empresa.
4. Atualizar a página e confirmar a persistência.
5. Concluir o próximo passo na grade e conferir a atualização da saúde.

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

Antes de usar com clientes reais, valide no seu Supabase com duas contas independentes: a conta B não deve ler, editar ou inserir registros da organização A, inclusive acessando a API diretamente. Testes locais executam as migrações reais em PostgreSQL embarcado (PGlite), com um esquema mínimo que simula as identidades do Supabase. Validam isolamento, convites, permissões, responsáveis, preservação do histórico e regras de saúde. Não substituem o teste do login e dos convites no Supabase hospedado.

## Limites desta primeira versão

- Convites por e-mail são criados na aba Equipe e aceitos dentro do app com conta de e-mail confirmado; não há envio automático de e-mail. O administrador deve compartilhar o endereço do app.
- Membros podem editar os registros comerciais da própria empresa; não há perfis de acesso granular, remoção de membros nem transferência de administração nesta etapa.
- Responsáveis agora são membros reais selecionados da equipe. Nomes antigos permanecem legíveis até serem substituídos por uma atribuição a usuário.
- Conversão automática de lead, mapa visual de influência, exclusão de registros, anexos, auditoria, IA e cobrança ficam para as próximas etapas.
- A listagem inicial carrega os cadastros da organização e até 1.000 eventos recentes; adicione paginação antes de volumes maiores.
- Não há personalização dos pesos do score nesta versão.
- Validação no navegador e fluxo real de autenticação/banco devem ser realizados após configurar o projeto.

## Referências

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls
- https://vercel.com/docs/git/vercel-for-github
