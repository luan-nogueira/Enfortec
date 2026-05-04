# Marketplace Híbrido 3 em 1 - TODO

## Fase 1: Estrutura Base e Autenticação
- [x] Configurar schema de banco de dados (users, products, sellers, orders, etc)
- [x] Implementar autenticação com 3 roles: Admin, Cliente, Vendedor
- [x] Criar dashboard personalizado por perfil (Admin e Vendedor)
- [x] Implementar recuperação de senha (via Manus OAuth)

## Fase 2: Loja Própria (Produtos Físicos)
- [x] Criar modelo de dados para produtos da loja
- [x] Implementar CRUD de produtos (admin) - routers tRPC criados
- [x] Criar página de listagem de produtos (Store.tsx)
- [x] Implementar filtros e busca avançada
- [ ] Integração com API Mercado Livre (criar anúncios) - requer chaves API
- [ ] Sincronizar preços e estoque com Mercado Livre - requer chaves API
- [ ] Redirecionar compra para Mercado Livre - requer chaves API

## Fase 3: Marketplace de Usados
- [x] Criar modelo de dados para produtos usados
- [x] Implementar cadastro de vendedor (routers tRPC criados)
- [x] Painel do vendedor para listar produtos usados (SellerDashboard.tsx)
- [x] Formulário para adicionar produtos usados (AddUsedProduct.tsx)
- [ ] Sistema de comissão configurável (backend)
- [ ] Status de venda: Pendente → Aprovado → Entregue (com fluxo completo)
- [x] Aprovação/reprovação de anúncios (admin) - UI criada
- [ ] Avaliação de vendedores (sistema de reviews backend)

## Fase 4: Mídia Digital
- [x] Criar modelo de dados para produtos digitais
- [x] Upload ou inserção de chave/código (schema criado)
- [ ] Entrega automática após pagamento (webhook Mercado Pago)
- [x] Área para usuários venderem produtos digitais (DigitalMedia.tsx)
- [x] Formulário para vender produtos digitais (SellDigitalProduct.tsx)
- [ ] Comissão automática sobre vendas (integração Mercado Pago)

## Fase 5: Sistema de Pagamentos
- [ ] Integração com Mercado Pago (API key necessária)
- [ ] Separação automática de comissão (lógica no backend)
- [ ] Repasse ao vendedor (webhook de pagamento)
- [ ] Webhook para confirmação de pagamento (entrega automática digital)

## Fase 6: Painel Administrativo
- [x] Dashboard admin com estatísticas (AdminDashboard.tsx criado)
- [ ] Gerenciar usuários (CRUD completo)
- [ ] Gerenciar produtos (todos os tipos)
- [x] Definir comissão (%) - UI criada
- [x] Visualizar vendas - gráficos com Recharts
- [x] Aprovar/reprovar anúncios - UI criada
- [x] Relatórios: vendas totais, lucro, produtos mais vendidos
- [x] Gráficos com Recharts (BarChart, PieChart)

## Fase 7: Funcionalidades Extras
- [x] Sistema de cupons de desconto (schema criado)
- [ ] Notificações por e-mail (Manus notification API)
- [ ] Chat em tempo real entre comprador e vendedor (messages table criada)
- [ ] Avaliação de vendedores (reviews table criada)

## Fase 8: Frontend e Design
- [x] Home pública com navegação clara (Home.tsx com hero section)
- [x] Design responsivo mobile-first (Tailwind CSS)
- [x] Paleta de cores vibrante (orange, green, purple, blue)
- [x] Inspiração: Mercado Livre, Shopee, Amazon (cards, gradients, icons)
- [x] Formulários de venda (BecomeSellerForm, AddUsedProduct, SellDigitalProduct)
- [x] Dashboards por perfil (Admin, Vendedor)
- [ ] Otimização de UX/UI (polish final)

## Fase 9: Deploy e Finalização
- [x] Testes com Vitest (unit tests) - 17 testes passando
- [x] Corrigir erro de sellers.getByUserId (retornando undefined)
- [x] Corrigir rota /virar-vendedor (404 error)
- [ ] Otimização de performance
- [ ] Deploy da aplicação (Manus hosting)
- [ ] Documentação final e guia de uso


## Fase 10: Rebranding Eforte Games - COMPLETO
- [x] Atualizar Home.tsx com logo e tema neon Eforte Games
- [x] Alterar paleta de cores: laranja neon (#FF6B35), preto (#0a0a0a), branco
- [x] Atualizar nome da plataforma para "Eforte Games" em todas as páginas
- [x] Adicionar efeitos neon/glow ao design (text-shadow, box-shadow)
- [x] Rebranding de Admin Dashboard com tema neon
- [x] Rebranding de Store.tsx com tema neon
- [x] Rebranding de UsedMarketplace.tsx com tema neon
- [x] Rebranding de DigitalMedia.tsx com tema neon
- [x] Rebranding de SellerDashboard.tsx com tema neon
- [x] Atualizar footer com informações da Eforte Games (+55 43 8425-3691)
- [x] Adicionar tema gaming/neon a todos os botões e componentes (btn-neon, card-neon)
- [x] Atualizar CSS global com tema escuro e gradientes


## Fase 11: Mudança de Cores para Vermelho e Preto - COMPLETO
- [x] Atualizar paleta de cores: vermelho (#DC143C), preto (#0a0a0a), branco
- [x] Atualizar index.css com cores vermelhas
- [x] Atualizar Home.tsx com tema vermelho/preto
- [x] Atualizar Store.tsx com tema vermelho/preto
- [x] Atualizar UsedMarketplace.tsx com tema vermelho/preto
- [x] Atualizar DigitalMedia.tsx com tema vermelho/preto
- [x] Atualizar AdminDashboard.tsx com tema vermelho/preto
- [x] Atualizar SellerDashboard.tsx com tema vermelho/preto
- [x] Testar responsividade com novo design (17 testes passando)
