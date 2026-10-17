# Barotto 3D — Orçamentos

Sistema de orçamentos de impressão 3D, em português, sem backend ou dependências de execução externas. Funciona no computador e no celular.

## Executar localmente

Requer Node.js 20 ou superior.

```powershell
npm start
```

Abra http://localhost:4173 no navegador. Encerre o servidor com Ctrl+C. Para outra porta: `$env:PORT=4174` antes de iniciar. O servidor escuta apenas no computador local.

## Uso

1. Em Configurações, informe os dados da Barotto 3D, custos da impressora e condições de pagamento.
2. No orçamento, preencha o cliente e adicione quantos produtos precisar. **Peso e tempo correspondem a uma unidade**, incluindo os suportes e purgas consumidos. Use horas decimais: 1,5 h = 1 h e 30 min.
3. Em Configurações, defina separadamente **Markup — consumidor final** e **Markup — lojista**. No orçamento, escolha o tipo de cliente. O catálogo mostra os dois preços. Deixe o preço unitário em branco para usar a sugestão ou informe um preço manual, que será mantido para os dois tipos. Markup é multiplicador de custo: 3× significa vender por três vezes o custo.
4. Informe prazo, desconto, frete e observações. Frete zero é exibido como “A combinar / retirada”.
5. Salve e visualize a proposta. Na tela de exportação, use **Exportar proposta para** para escolher **Consumidor final** ou **Lojista**. A prévia, o total e o orçamento salvo são atualizados com o markup correspondente. Baixe um HTML que abre sem o sistema, copie o texto para WhatsApp ou use “Salvar PDF / Imprimir” para gerar PDF no diálogo do navegador.
6. A proposta do cliente contém produtos e condições comerciais. Custos, parâmetros e margem ficam somente na área interna.

O histórico permite reabrir, editar, duplicar e excluir orçamentos. Na proposta, registre manualmente o status como Rascunho, Enviado, Aprovado ou Recusado. Alterar o status não envia mensagens. O catálogo permite cadastrar e reutilizar produtos.

## Seus dados

Dados salvos no `localStorage` deste navegador, sob a chave `3dorca.v1`. O rascunho é salvo automaticamente. Salvar um orçamento o adiciona ao histórico. Valores iniciais são exemplos editáveis; nenhum orçamento de exemplo aparece no histórico.

Use **Configurações → Baixar backup** regularmente. Limpar os dados do navegador remove os registros. Outro navegador, computador, porta ou domínio tem armazenamento separado. Exporte no endereço local e restaure no site publicado para transferir os dados. Restaurar um backup substitui os dados locais após confirmação e validação do arquivo. O backup contém informações de clientes; guarde-o com cuidado. Não coloque backups no repositório GitHub.

Custos de produção são fotografados em cada orçamento: mudar os padrões não altera retroativamente propostas salvas. Os dados comerciais da empresa usados na exportação são os dados atuais das configurações. O botão “Ajustar custos deste orçamento” permite atualizar valores especificamente para ele.

Orçamentos e backups anteriores continuam compatíveis. O markup anterior é usado inicialmente para os dois tipos, preservando os valores existentes. Para mudar os multiplicadores de um orçamento existente, use “Ajustar custos deste orçamento”. A escolha na exportação é salva no orçamento e permanece após recarregar.

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

Publicação remota aguardando avaliação da versão local pelo proprietário. Não há credenciais ou dados de clientes nos arquivos de código.

Referência funcional: https://calculesuaimpressao3d.netlify.app/. Interface e implementação próprias.
