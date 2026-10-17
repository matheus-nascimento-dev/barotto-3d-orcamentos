# 3DOrça — versão local

Objetivo: transformar dados de impressão em um orçamento com vários produtos e uma proposta comercial compartilhável.

Decisões de implementação: HTML, CSS e módulos JavaScript sem dependências; servidor Node local; dados no localStorage do navegador, backup JSON; proposta HTML independente e impressão em PDF pelo navegador. Valores iniciais são exemplos editáveis. Custos e margens nunca entram na proposta do cliente. O preço usa custo com reserva de falhas multiplicado pelo markup; taxas sobre a venda são descontadas do lucro estimado. Frete é repassado sem margem. Peso e tempo são por unidade.

Arquivos: core.js (cálculo e validação), app.js (interface e estado), proposal.js (documento público), styles.css (interface responsiva), server.mjs (servidor local), tests/core.test.js (regras financeiras e persistência).

- [x] Verificar cálculos, centavos, desconto, múltiplos produtos e limites.
- [x] Construir editor, histórico, catálogo, configurações e backup.
- [x] Construir proposta pública com download HTML, texto e impressão.
- [x] Validar criação, salvamento, recarga, reabertura e proposta no navegador.
- [x] Preparar repositório e GitHub Pages sem publicar antes da avaliação local.

Validação: 14 testes automatizados e verificação de sintaxe aprovados. No navegador: dois produtos (PLA e PETG), quatro unidades, subtotal R$ 212,70, desconto R$ 12,70, frete R$ 15,00, total R$ 215,00; recarga e reabertura preservam valores. Proposta HTML baixada sem parâmetros internos, backup JSON baixado e restaurado, status e catálogo persistidos. Layout móvel inspecionado sem transbordamento horizontal. A impressão aciona o diálogo do navegador; o PDF final deve ser salvo nele. Revisão independente dos problemas de persistência e validação concluída.

Limites: sem sincronização entre dispositivos; limpar o navegador apaga os dados sem backup. Não há envio de mensagem automático. Publicação no GitHub Pages autorizada pelo usuário após avaliação local, em https://matheus-nascimento-dev.github.io/barotto-3d-orcamentos/.
