# Proposta de migrações — Fase B do dashboard

**Status: proposta para aprovação. Não aplicada, sem arquivos executáveis em supabase/migrations e sem interface da Fase B implementada.**

O schema atual (001–004) tem criação, etapa atual, fechamento previsto, tarefas, qualificação JSON e histórico de relacionamento de conta/contato. Não registra a data real de encerramento ou entrada em etapa, metas, categorias de forecast, motivos de encerramento, vínculo de conversão de lead ou atividades da oportunidade.

## 005 — Datas e histórico de oportunidades

### Colunas propostas em opportunities

| Coluna | Tipo | Regra |
| --- | --- | --- |
| updated_at | timestamptz | Preenchida pelo servidor em novas gravações; valor legado NULL |
| stage_entered_at | timestamptz | Entrada real na etapa em novos negócios/trocas; legado NULL |
| closed_at | timestamptz | Preenchida ao encerrar; legado NULL |
| forecast_category | text | Pipeline, Best case ou Commit; default Pipeline |
| close_reason_id | uuid | Motivo configurável, FK composta com organization_id |
| close_reason_notes | text | Observação do encerramento |

### Nova tabela opportunity_stage_events

- id uuid PK, organization_id uuid, opportunity_id uuid, previous_stage text NULL, new_stage text, occurred_at timestamptz default now(), changed_by uuid autenticado, event_kind (`created`, `stage_change`, `reopened`, `baseline`).
- Snapshots no evento: `value_at_event numeric(14,2)`, `assignee_id_at_event uuid NULL`, `close_reason_id uuid NULL` e `close_reason_notes text`. Permitem preservar valor, responsável e motivo ao encerrar/reabrir; as métricas de resultado usam esses fatos, sem reatribuir ganhos antigos ao responsável atual. Motivo com FK composta à mesma organização.
- FK `(opportunity_id, organization_id)` para opportunities. Usuário só pode ser membro da organização; ator determinado no servidor.
- Índices `(organization_id, occurred_at)`, `(organization_id, opportunity_id, occurred_at)`.
- Evento de mudança gerado por trigger transacional: alteração da oportunidade e log são atômicos. Datas não são editáveis pelo cliente.
- SELECT: membros da organização. INSERT/UPDATE/DELETE diretos: revogados; somente trigger/função interna auditada. Política SELECT: `USING (public.is_member(organization_id))`. As tabelas novas terão RLS habilitada antes de conceder acesso.
- Não inferir entradas/encerramentos antigos de created_at. Se registrar baseline dos dados existentes, marcá-lo explicitamente e excluí-lo de métricas de duração/conversão. Datas históricas conhecidas poderão ser importadas depois em fluxo separado.

### Nova tabela sales_close_reasons

- id uuid PK, organization_id uuid, kind (`won` / `lost`), label text, active boolean, sort_order integer; unique `(organization_id, kind, label)`; unique `(id, organization_id)`.
- SELECT: membros. Criação/edição: apenas owner da organização. DELETE não permitido para motivos usados; inativar preserva histórico.
- Regra: uma nova transição para Ganha/Perdida exige motivo ativo, do tipo correto e da mesma organização. Validar no banco e no modal. Não invalidar retrospectivamente negócios encerrados antes da migração.
- Reabertura gera evento e remove a condição de encerramento corrente sem apagar o log anterior.

**Métricas habilitadas:** encerramentos reais no período, win rate = ganhas/(ganhas+perdidas), ticket médio, ciclo de venda, duração e conversão entre etapas. Cada uma terá denominador, janela e cobertura histórica explícitos; evitar médias com legados sem datas.

## 006 — Metas, lead convertido e atividades

### Nova tabela sales_targets

- id uuid PK, organization_id uuid, assignee_id uuid, period_start date, period_end date, target_amount numeric(14,2) não negativo, created_by uuid, created_at e updated_at timestamptz.
- FK `(organization_id, assignee_id)` para memberships; datas válidas e período não invertido.
- SELECT: membros da organização, para revisão colaborativa. Mutação: apenas owner. Constraint de exclusão por organização/vendedor e intervalo de datas impede períodos sobrepostos inclusive em gravações diretas. RPC de gravação valida membership e registra ator no servidor; escrita direta é revogada para o cliente.
- Realizado: soma bruta dos encerramentos ganhos reais na janela e responsável do snapshot de encerramento, tratando reaberturas explicitamente para evitar duplicação. Meta restante = max(meta − realizado, 0). Cobertura = pipeline elegível para essa janela/meta restante; referência 3x. Se meta restante é zero, mostrar Meta atingida, sem divisão por zero; sem meta, Não configurada.
- “Todos” agrega apenas metas de janela compatível, sem duplicar metas sobrepostas. Prever regras claras para negócios sem responsável, mudança de responsável e moeda BRL.

### Conversão de leads

- Em leads: `source_normalized text`, `converted_at timestamptz NULL`, `converted_opportunity_id uuid NULL`.
- Em opportunities: `lead_id uuid NULL`.
- FKs compostas com organization_id e constraints para uma conversão inicial consistente; nenhum vínculo pode atravessar organizações.
- Origem normalizada: Indicação, LinkedIn, Site, Evento, Outbound, Anúncio, Outro. Preservar source original; classificar valores não reconhecidos como Outro, mantendo o texto original, sem atribuir relações por nome/e-mail.
- RPC transacional convert_lead: verifica membership, grava vínculo e data do servidor e impede conversão duplicada. Sem mudança obrigatória na lista atual de status do lead; exibir selo Convertido a partir da data.
- Backfill: normalização determinística dos textos de origem. Não inventar conversões de leads legados.
- Conversão por origem: leads convertidos / leads criados na safra selecionada, com origem, janela e cobertura explícitas. Não é win rate.

### Nova tabela opportunity_activities

- id uuid PK, organization_id uuid, opportunity_id uuid, activity_type (`call`, `meeting`, `email`), summary text, occurred_at timestamptz, actor_id uuid, created_at timestamptz.
- FK composta para oportunidade da mesma organização. Criador validado no servidor; membro da organização.
- SELECT: `USING (public.is_member(organization_id))`. INSERT: `WITH CHECK (public.is_member(organization_id) AND actor_id = auth.uid())`. Histórico preservado; edição de correções por novos registros, sem apagamento comum.
- Índices `(organization_id, actor_id, occurred_at)`, `(organization_id, opportunity_id, occurred_at)`.
- Atividades 1:1 filtradas pelo ator e data da atividade, sem confundir quem executou com quem é responsável pelo negócio. Não fazem chamadas nem enviam e-mail.

## 007 — Checklist e agregações protegidas

### Checklist enxuto

- Reutilizar qualification JSON como fonte de verdade para decisor, orçamento, prazo e dor, com evidência; novo item `competitor` para concorrência. Não criar uma segunda tabela que diverge das evidências atuais.
- Progresso visual: itens confirmados com evidência / cinco itens. Texto desconhecido aparece como lacuna.
- Preservar todos os critérios atuais e a fórmula `context-v1`, inclusive os pesos. Concorrência não receberá peso adicional por aprovação desta fase; qualquer nova pontuação exige aprovação separada. Novas informações podem entrar nos textos que a fórmula atual já lê, de forma explícita.
- Validação JSON e gravação atômica via função para garantir formato e membership. Migração aditiva; não sobrescrever evidências legadas.

### RPCs/Views propostas

- `sales_review_summary(org_id, start_date, end_date, owner_id, date_basis)`: valores brutos, contagens, atenção, concentração, metas/realizado, movimentações atuais e anteriores, grupos por etapa, mês e forecast. date_basis explícita: criação, fechamento previsto, evento/encerramento conforme o bloco.
- `sales_review_deals(...)`: detalhe paginado que usa exatamente o mesmo predicado das agregações, para preservar a igualdade entre KPIs e listas.
- `sales_review_stage_metrics(...)`: duração/conversão a partir de eventos reais, ignorando baseline e dados sem datas.
- `sales_review_sources(...)`, `sales_review_activities(...)`: conversão por origem e atividades por ator.
- Views com `security_invoker=true`; RPCs preferencialmente SECURITY INVOKER. Se um helper SECURITY DEFINER for necessário, search_path vazio, nomes qualificados, membership explícita, execução anon/public revogada e testes cruzando organizações.
- Nenhum objeto pode aceitar org_id e confiar apenas nesse parâmetro. Todos os filtros de data/usuário serão validados; nenhum serviço administrativo exposto ao navegador.
- Soma e agrupamento no banco; paginação por chave/data, índices definidos acima, contagem da consulta filtrada e revalidação após mutações. Seguir o reload atual, sem polling contínuo.
- Para a saúde média, manter a mesma fórmula do app. Uma execução/cache no servidor exige portabilidade testada contra os mesmos vetores de `context-v1`, incluindo negação, arredondamento e data de referência; não substituir por score/100 como chance de fechamento. O cache, se aprovado junto ao port, será privado para gravação, com versão do cálculo, computed_at e invalidação por mudanças/dia.

## Ordem, migração e testes

1. Aprovar este escopo.
2. Preparar os SQLs 005–007 e testar num banco separado antes de aplicar ao projeto real.
3. Migrações transacionais, aditivas, com defaults cuidadosos e backfill apenas de fatos conhecidos. Banco antes da UI que exige colunas novas; fallback para versões antigas durante o deploy.
4. Testes: não membro/anon sem acesso; motivos de outra empresa rejeitados; metas para não membros rejeitadas; conversão duplicada bloqueada; evento atômico; ator impossível de forjar; datas e períodos válidos; divisão por zero; legados excluídos de durações; paridade do score e igualdade entre totais/RPC e listas.
5. Depois da aprovação e implementação, instruir a execução no Supabase. Não aplicar nada em produção antes disso.

**O que a aprovação autoriza:** implementar os objetos e fluxos acima, mantendo os pesos do score. Não autoriza recalibrar o algoritmo, importar história não comprovada, enviar e-mail, contratar serviços externos ou criar metas reais sem instrução.
