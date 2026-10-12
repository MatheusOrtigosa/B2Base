# Revisão visual do B2Base

Documento da revisão visual do MVP 0.3. O cockpit e a nova composição do score do MVP 0.4 estão descritos no README.

Esta revisão preserva schema, políticas, rotas de negócio, autenticação, consultas e mutações no Supabase, além das fórmulas de qualificação e saúde. Não requer migração SQL.

## 1. Tokens e tipografia

Arquivos: `styles/tokens.css`, `app/globals.css`, `app/layout.tsx`, `app/icon.svg`, `package.json`, `package-lock.json`.

Verde de marca único, lime para foco e destaque, neutros esverdeados, cinco famílias semânticas com fundo/texto/borda, raios e sombras compartilhados. Manrope local em títulos e logo; interface sans legível; metadados a partir de 12px e números tabulares. Ícone B² no favicon.

Verificação: contraste dos pares de texto/fundo do tema medido em script (todos acima de 4,5:1), checagem de tipos e build da fonte local.

## 2. Sidebar e header

Arquivos: `app/page.tsx`, `components/ui.tsx`, `components/global-search.tsx`, `app/globals.css`.

Ícones SVG da mesma família com ícones distintos para Contatos e Equipe; seletor de empresa estilizado preservando o controle nativo acessível; usuário e saída agrupados; busca global Ctrl/Cmd+K nos registros já carregados da empresa ativa; menu da conta; densidade confortável/compacta; sidebar móvel recolhível. A busca não faz chamadas adicionais à API.

Verificação: checagem de tipos. Alterar densidade só muda espaçamento visual; preferência não é persistida nesta etapa.

## 3. Base de formulários

Arquivos: `components/ui.tsx`, `components/entity-form.tsx`, `components/relationship-fields.tsx`, `app/globals.css`.

Modal/Drawer, FormField, FormSection e FormFooter reutilizáveis; cabeçalho/rodapé fixos e corpo rolável; títulos específicos; foco inicial, navegação circular por Tab, Esc, restauração do foco e confirmação de descarte; controles desabilitados durante envio e proteção contra duplo clique; mensagens de validação nativa em português, com resumo e foco no primeiro campo inválido.

Verificação: checagem de tipos; controles mantêm os mesmos nomes de campos usados pelo save existente. As dez funções de autenticação, leitura e mutação foram comparadas com a versão anterior: preservadas, exceto o texto de sucesso do save.

## 4. Login

Arquivos: `components/login-screen.tsx`, `app/page.tsx`, `app/globals.css`.

Headline única, prévia identificada como ilustrativa, botão mostrar/ocultar senha, recuperação junto ao rótulo da senha, cadastro secundário contornado, fonte e contraste coerentes, logo no formulário mobile. Sem provedores sociais que não existem no backend.

Verificação: checagem de tipos e build; fluxo de autenticação e nomes dos inputs preservados.

## 5. Dashboard

Arquivos: `components/crm-views.tsx`, `lib/presentation.ts`, `app/page.tsx`, `app/globals.css`.

Plano de ação primeiro e em destaque; prazos relativos com data completa no tooltip; estado de atraso e conclusão; oportunidade/empresa como contexto; oportunidades com badges de etapa, score e próximo passo; medidor da saúde média; KPI de atenção e prazo vencido com significado semântico; nota informativa e estados vazios acionáveis; skeletons.

Verificação: cálculos existentes preservados; somente ordenação/apresentação de tarefas, sem mutações adicionais.

## 6. Kanban

Arquivos: `components/crm-views.tsx`, `app/page.tsx`, `app/globals.css`.

Colunas flexíveis de largura mínima 260px com scroll; cabeçalho com nome, contador, total e único botão adicionar; Ganha/Perdida distintas; empresa, nome, valor, avatar, responsável, próximo passo, prazo, risco e score; fechamento rotulado; hover; filtros locais por responsável/risco/faixa de score e alternância Kanban/Lista.

Verificação: checagem de tipos; filtros não consultam nem alteram o banco. Adicionar no cabeçalho pré-seleciona a etapa no formulário, reutilizando o save existente.

## 7. Formulários por entidade e Leads

Arquivos: `components/entity-form.tsx`, `components/relationship-fields.tsx`, `components/crm-views.tsx`, `app/page.tsx`.

Títulos/CTAs específicos; seções de contexto; score de lead em tempo real com a fórmula existente e sliders mais valor numérico editável; origem com sugestões e texto livre; chips de status/etapa; relações pesquisáveis; oportunidade em drawer; prazos rápidos; novo próximo passo sugere usuário atual quando há equipe configurada. Leads em tabela com score, status, origem, cadastro e filtros.

Verificação: tipos, fórmulas e testes existentes. E-mails continuam usando validação de formato do navegador; nenhuma nova rejeição de backend.

## 8. Acessibilidade e responsividade

Arquivos: `components/ui.tsx`, `components/relationship-detail.tsx`, `app/page.tsx`, `app/globals.css`.

Estados com texto/ícones; foco visível; modais com semântica e navegação por teclado; confirmação de descarte; layouts mobile; alvos de toque de 44px no mobile; prefers-reduced-motion.

Verificação: os 27 testes de score, saúde e banco passaram; TypeScript e build passaram. Não há navegador de QA disponível nesta sessão, portanto screenshots, auditoria automática de acessibilidade e interação real em desktop/mobile permanecem pendentes de conferência no aplicativo publicado.

## Escolhas de escopo

- Drag-and-drop não foi criado nem simulado: o kanban anterior não tinha esse comportamento, e persistir movimentações exigiria mudar o fluxo de mutação. A etapa continua editável no formulário.
- O banco não tem data de entrada em cada etapa. O cartão exibe **Criada há…**, usando created_at, sem apresentar isso como dias na etapa.
- Variação contra período anterior não aparece: não há histórico de métricas comparáveis disponível.
- A criação inline de empresa e a criação simultânea de tarefa com oportunidade não foram acrescentadas: introduziriam novas mutações/fluxos de persistência. As relações são pesquisáveis e o formulário orienta a criar o próximo passo pelo fluxo existente.
- Mantidos formato e validação atuais de telefone, identificação fiscal e valor numérico. Não foi imposta validação de dígitos de CNPJ que poderia rejeitar identificações fiscais de outros países ou alterar registros existentes.
- Seletor de workspace conserva um select nativo sob uma camada visual; relações usam busca + select, evitando um combobox complexo sem biblioteca especializada.
- Tema claro nesta versão; cores centralizadas permitem uma futura versão escura.
- As mensagens operacionais foram refinadas conforme a solicitação (títulos/CTAs por entidade, saudação e apresentação do score). Textos de critérios e fórmulas de negócio foram preservados.
