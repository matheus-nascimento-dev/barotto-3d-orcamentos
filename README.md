# Barotto 3D — Orçamentos

Sistema de orçamentos de impressão 3D, em português, sem backend ou dependências de execução externas. Funciona no computador e no celular.

Site: [Barotto 3D — Orçamentos](https://matheus-nascimento-dev.github.io/barotto-3d-orcamentos/).

## Executar localmente

Requer Node.js 20 ou superior.

```powershell
npm start
```

Abra http://localhost:4173 no navegador. Encerre o servidor com Ctrl+C. Para outra porta: `$env:PORT=4174` antes de iniciar. O servidor escuta apenas no computador local.

## Uso

1. Em Configurações, informe os dados da Barotto 3D, custos da impressora e condições de pagamento.
2. Cadastre a **Quantidade produzida no lote** e escolha se peso e tempo são **Do lote inteiro** (padrão dos novos produtos) ou **Por unidade**. No modo lote, informe os totais do fatiador, incluindo suportes e purgas: peso, horas, acabamento e extras são divididos pela quantidade produzida. O cadastro mostra **Custo por unidade** e **Custo total do lote**. No orçamento, aparecem o custo unitário e o custo das peças solicitadas. Use horas decimais: 1,5 h = 1 h e 30 min.
3. Em Configurações, defina separadamente **Markup — consumidor final** e **Markup — lojista**. No orçamento, escolha o tipo de cliente. O catálogo mostra os dois preços. Deixe o preço unitário em branco para usar a sugestão ou informe um preço manual, que será mantido para os dois tipos. Markup é multiplicador de custo: 3× significa vender por três vezes o custo.
4. Informe prazo, desconto, frete e observações. Frete zero é exibido como “A combinar / retirada”.
5. Salve e visualize a proposta. Na tela de exportação, use **Exportar proposta para** para escolher **Consumidor final** ou **Lojista**. A prévia, o total e o orçamento salvo são atualizados com o markup correspondente. Baixe um HTML que abre sem o sistema, copie o texto para WhatsApp ou use “Salvar PDF / Imprimir” para gerar PDF no diálogo do navegador.
6. A proposta do cliente contém produtos e condições comerciais. Custos, parâmetros e margem ficam somente na área interna.

O histórico permite reabrir, editar, duplicar e excluir orçamentos. Na proposta, registre manualmente o status como Rascunho, Enviado, Aprovado ou Recusado. Alterar o status não envia mensagens. O catálogo permite cadastrar e reutilizar produtos.

**Quantidade no orçamento** é a quantidade solicitada pelo cliente. Ao usar um produto do catálogo, o orçamento começa com uma unidade e copia os preços de consumidor final e lojista do cadastro. O total do produto é sempre o preço unitário do tipo selecionado multiplicado pela quantidade solicitada. Peso, tempo e tamanho do lote são definidos no cadastro, sem precisar informá-los novamente no orçamento. O custo por unidade e o custo das peças solicitadas aparecem na área interna. Custos de embalagem e rateio fixo continuam por peça; o preço do material continua em R$/kg.

Os preços copiados ficam preservados no orçamento. Para buscar alterações posteriores do produto ou das configurações, use **Atualizar pelo cadastro**. Em itens de orçamentos antigos que correspondam a um produto cadastrado, use **Usar preço do catálogo**, mantendo a quantidade já solicitada. Produtos avulsos continuam disponíveis com os dados de produção em uma seção recolhida; ao salvá-los no catálogo, passam a usar a precificação do cadastro.

## Seus dados

Dados salvos no `localStorage` deste navegador, sob a chave `3dorca.v1`. O rascunho é salvo automaticamente. Salvar um orçamento o adiciona ao histórico. Valores iniciais são exemplos editáveis; nenhum orçamento de exemplo aparece no histórico.

Use **Configurações → Baixar backup** regularmente. Limpar os dados do navegador remove os registros. Outro navegador, computador, porta ou domínio tem armazenamento separado. Exporte no endereço local e restaure no site publicado para transferir os dados. Restaurar um backup substitui os dados locais após confirmação e validação do arquivo. O backup contém informações de clientes; guarde-o com cuidado. Não coloque backups no repositório GitHub.

Custos de produção são fotografados em cada orçamento: mudar os padrões não altera retroativamente propostas salvas. Produtos do catálogo guardam uma cópia dos parâmetros usados para seus dois preços unitários. O botão “Ajustar custos deste orçamento” atualiza os produtos avulsos e as taxas do resultado estimado; produtos cadastrados preservam seus preços. Os dados comerciais da empresa usados na exportação são os dados atuais das configurações.

Orçamentos e backups anteriores continuam compatíveis. O markup anterior é usado inicialmente para os dois tipos, preservando os valores existentes. Para mudar os multiplicadores de um orçamento existente, use “Ajustar custos deste orçamento”. A escolha na exportação é salva no orçamento e permanece após recarregar.

Produtos anteriores à opção de lote mantêm os dados **Por unidade**, sem alterar os valores salvos. Para usar seus dados do fatiador como lote, edite o produto, escolha **Do lote inteiro** e informe a quantidade produzida. No modo lote, custos totais usam a precisão original e são arredondados ao final; por isso podem diferir em alguns centavos da multiplicação do custo unitário exibido.

## Cálculo

Custo unitário = (material + energia + desgaste da impressora + rateio fixo + embalagem + acabamento + extras) × (1 + reserva de falhas / 100).

Preço sugerido = custo unitário × markup, arredondado para centavos antes de multiplicar pela quantidade. Taxas incidem sobre o valor dos produtos após desconto. Lucro estimado = valor dos produtos após desconto − custo total − taxas. Frete é tratado como repasse integral. Reserva de falhas é um adicional de custo, seguindo a abordagem da referência; não representa uma simulação de retrabalho.

## Verificação

```powershell
npm test
npm run check
```

## GitHub Pages

O workflow `.github/workflows/pages.yml` executa os testes e publica somente os seis arquivos da aplicação. Após disponibilizar o repositório no GitHub, ative **Settings → Pages → Source: GitHub Actions** e envie a branch `main`. Os caminhos relativos permitem hospedar em um subdiretório de GitHub Pages. O site permanece sem backend: os dados de cada usuário ficam no próprio navegador.

Publicação no GitHub Pages autorizada após avaliação local. Não há credenciais ou dados de clientes nos arquivos de código.

Referência funcional: https://calculesuaimpressao3d.netlify.app/. Interface e implementação próprias.
