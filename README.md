# B2Base

CRM para vendas B2B: empresas e contatos com contexto e saúde de relacionamento, histórico de interações, leads, oportunidades, qualificação com evidências e próximos passos.

## Stack

Next.js, React, TypeScript e Supabase (Postgres + Auth). Hospedagem na Vercel. Node.js 24.

## Colocar no ar

### 1. Preparar o Supabase

1. Abra seu projeto no Supabase e entre em **SQL Editor → New query**.
2. Em um projeto novo, execute `supabase/migrations/001_initial.sql`, depois `supabase/migrations/002_team_collaboration.sql`, `supabase/migrations/003_relationship_hub.sql` e `supabase/migrations/004_account_cockpit.sql`, uma única vez cada. Se o banco já está configurado, execute apenas as migrações ainda não aplicadas, em ordem. Os scripts rodam em transações e preservam os registros existentes.
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

## Revisão de vendas (MVP 0.5 — Fase A)

**Não exige nova migração.** Usa apenas as tabelas 001–004. A proposta da Fase B está em [docs/PHASE_B_PROPOSAL.md](docs/PHASE_B_PROPOSAL.md) e aguarda aprovação antes de preparar/aplicar SQL.

- Filtros globais: 7/30 dias, mês/trimestre atual ou intervalo personalizado, responsável e limiar de revisão (14 dias). Parâmetros `period`, `from`, `to`, `owner`, `stale`, `view`, `stage` e `workspace` preservam a seleção na URL. `Eu` corresponde ao usuário que abrir o link; use um membro específico para compartilhar sua seleção exata.
- O período seleciona oportunidades pela **data de criação**, em São Paulo. Mês/trimestre abrangem o início até hoje. Todos os blocos e o kanban usam essa mesma safra. As tarefas vinculadas são selecionadas pelos negócios da safra e pelo responsável da tarefa; tarefas independentes usam sua própria criação. Próximo passo de um negócio pode ser executado por outro vendedor e ainda conta como tarefa futura.
- Pipeline aberto, saúde média com tooltip, atenção e próximos passos com comparativos da safra anterior de igual duração. Comparar saúde usa o estado atual das duas safras, não snapshots antigos de score.
- Funil horizontal com quantidade e valor bruto, clique para abrir a etapa filtrada no kanban; previsão mensal com valor bruto, parcela vencida destacada, negócios expansíveis e tabelas acessíveis. **Nunca multiplicamos valores por score.**
- Atenção acumula motivos e ordena por gravidade/valor. Sem próximo passo = sem tarefa pendente, vinculada à oportunidade, com prazo hoje ou depois. Tarefa vencida/sem prazo não substitui uma ação futura.
- Plano de ação e conversas prioritárias mostram até cinco itens, com acesso à lista completa. Concentração mostra o percentual de valor aberto nos três maiores e alerta acima de 60%.
- Modo reunião com ordem de prioridade, resumo copiável em português e impressão/salvar PDF pelo navegador. Perguntas da próxima conversa usam regras de qualificação, sem IA externa.

### Precisão e limites dos dados atuais

Não há `updated_at`, entrada em etapa, encerramento real ou log de etapas no schema atual. Por isso:

- Não apresentamos distribuição atual entre etapas como taxa de conversão histórica.
- A lista de negócios antigos usa criação e informa **Sem data da etapa**; não afirma que ficaram parados naquela etapa. O limiar fica configurável para a revisão e para quando datas reais existirem.
- Ganhas/perdidas mostram o estado atual da safra criada no período; não representam negócios encerrados no período nem mudanças desde a reunião anterior. Datas de fechamento previsto nunca são tratadas como encerramento real.
- Metas, categorias de previsão, motivos, origem/conversão vinculada e atividades por vendedor aguardam a Fase B.

Para evitar totais silenciosamente truncados, a leitura das tabelas existentes é paginada e usa contagem exata, inclusive quando o limite da API é menor que 500/1.000. Mantém o cache em memória e recarrega após mutações, como o app anterior. **As agregações ainda são locais**: RPCs/views novas alteram o schema e estão incluídas na proposta, para aprovação. A Fase A ainda não atende ao requisito de agregações no banco para alto volume; é uma limitação explícita, não um recurso concluído.

### Validação desta entrega

Testes cobrem limites de datas/fuso, filtros e URL, igualdade entre escopo de dashboard e kanban, previsão bruta independente do score, próximos passos, motivos, pluralização, leitura com mais de 1.000 linhas e cancelamento ao trocar de workspace. Incluem os testes existentes de RLS/migrações em PostgreSQL. TypeScript e build de produção também devem passar. A conferência visual e do fluxo real de login no navegador permanece necessária no ambiente publicado.

## Cockpit e saúde contextual (MVP 0.4)

Em um banco que já recebeu a migração 003, execute **somente `004_account_cockpit.sql`** no SQL Editor. Preserva os contatos, empresas, evidências e oportunidades anteriores. O cockpit pode ser consultado antes da migração, mas o superior direto e a avaliação do vendedor só ficam editáveis após aplicá-la.

### Monitor por empresa

- Abra **Cockpit de contas** na sidebar e escolha a empresa.
- Resumo: saúde do relacionamento, pipeline, contatos e próximos passos.
- **Novo contato** e **Nova oportunidade** abrem o cadastro já com a empresa selecionada. Os cadastros gerais continuam disponíveis.
- Contatos e organograma: defina **Superior direto** no cadastro do contato. Só são oferecidas pessoas da mesma conta, excluindo o próprio contato e seus subordinados.
- O banco bloqueia ciclos e relações entre empresas/organizações diferentes. Para mover uma pessoa com subordinados a outra empresa, reorganize essas relações antes.
- As linhas do organograma representam hierarquia formal cadastrada. Pessoas sem superior aparecem em ramos separados, com a lacuna explícita. Não inferimos um diretor/CEO ou apoio à venda pelo cargo.
- Oportunidades e relacionamento: negócios e histórico da conta em visões próprias. Interações não precisam de uma oportunidade.
- Também há acesso ao cockpit e criação de contatos/oportunidades no detalhe da empresa.

### Novo score da oportunidade

O score exibido em dashboard, kanban, lista, cockpit e detalhe passa a usar a mesma função de saúde contextual. O score de lead continua com a fórmula anterior.

| Fator | Peso | Base |
| --- | --- | --- |
| Qualificação e contexto | 25% | Critérios confirmados com evidência; o checklist antigo agora é apenas um fator |
| Percepção do vendedor | 25% | Muito desfavorável (5), desfavorável (25), neutro (50), favorável (75), muito favorável (95), sempre com justificativa |
| Sinais nos textos | 15% | Expressões favoráveis/de atenção em discovery, evidências e justificativa da própria oportunidade |
| Engajamento recente | 15% | Recência de conversa, conversas e tentativas sem resposta nos últimos 30 dias, com a conta |
| Cobertura de pessoas | 10% | Quantidade de contatos e presença de decisor, apoiador e influenciador, com limites |
| Histórico do relacionamento | 10% | Conversas realmente realizadas e período entre elas; tempo sem interação não basta |

- A contribuição de cada fator é o seu peso multiplicado por sua leitura de 0 a 100. Dados desconhecidos contribuem zero e aparecem explicitamente como desconhecidos; os demais pesos não são aumentados para compensar.
- O painel exibe quanto do peso total tem dados disponíveis. Abaixo de 50% de cobertura, usa **Pouco contexto**, mesmo que exista alguma pontuação.
- As faixas são: **Forte** (75+), **Em construção** (50–74) e **Atenção** (abaixo de 50), quando há cobertura suficiente.
- A percepção sem justificativa não pontua. Avaliações com mais de 60 dias têm a distância de 50 reduzida pela metade até o vendedor atualizar a avaliação/justificativa.
- Textos curtos ou sem expressões reconhecidas permanecem desconhecidos. Repetições não multiplicam pontos; negações, hipóteses e aprovações ainda aguardadas têm tratamento básico.
- Textos são processados localmente por regras em português. Não existe LLM, análise semântica completa ou envio a uma API de IA nesta versão; ambiguidade e ironia podem ser interpretadas incorretamente. O painel mostra os trechos reconhecidos para revisão.
- Registros de notas e tentativas sem resposta não contam como conversa realizada para tempo de relacionamento. Conversas distantes há mais de 60 dias reduzem o fator de familiaridade pela metade.
- Engajamento/contatos/tempo são sinais da **conta**, não evidência de apoio ao negócio específico. Essa distinção aparece no painel.
- Ajustes adicionais: conta manualmente em risco (−10), comunicação mais recente com ponto de atenção (−5), tarefas vencidas da própria oportunidade (−2 cada, até −5). Os ajustes somados têm limite de −20 e são explicados no painel.
- Este é um modelo inicial de priorização, não uma probabilidade calibrada de fechamento. Os pesos são hipóteses de produto que precisam ser validadas com uso real. A evolução para sentimento semântico e aprendizado com negócios ganhos/perdidos requer uma etapa própria.
- O score é calculado ao exibir os registros; não há histórico de snapshots de score nesta etapa. Na versão 0.5, o histórico é lido em páginas até a contagem total disponível, sem limite silencioso de 1.000 registros.

### Validação rápida

1. Abra o cockpit de uma empresa existente.
2. Cadastre um diretor e outro contato subordinado a ele. Confira a linha no organograma.
3. Crie uma oportunidade pelo cockpit e confira o vínculo no funil geral.
4. Abra a oportunidade, registre a percepção do vendedor e uma justificativa, salve e atualize a página.
5. Compare o mesmo score no cockpit, funil e detalhe. Confira os fatores e os trechos reconhecidos.

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

O histórico da empresa reúne seus eventos diretos e os eventos dos contatos ligados a ela no momento do registro. Essa empresa é registrada no banco na criação do evento e permanece no histórico se o contato mudar de empresa. O histórico pode ser filtrado por tipo e é ordenado pela data da interação. A versão 0.5 lê o histórico em páginas por organização até completar a contagem total; cargas sob demanda e agregações no banco estão propostas para a próxima fase.

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

## Qualificação original e score de lead

- Lead: 60% aderência + 40% intenção, ambos avaliados manualmente entre 0 e 100.
- Subscore de qualificação da oportunidade (25% do novo score contextual): problema/impacto (25), decisor/apoio (20), adequação (20), orçamento (15), prazo/processo (10), próximo passo (10).
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
- As tabelas e o histórico são lidos em páginas, mas ainda reunidos no cliente. Para volume maior, aprovar e implementar as consultas agregadas/paginadas no banco da proposta da Fase B.
- Não há personalização dos pesos do score nem sentimento semântico por IA nesta versão.
- Validação no navegador e fluxo real de autenticação/banco devem ser realizados após configurar o projeto.

## Referências

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls
- https://vercel.com/docs/git/vercel-for-github
