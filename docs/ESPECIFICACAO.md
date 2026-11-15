# Agenda Odontológica — Especificação Estrutural (v0.3)

> Rascunho de estrutura e regras de negócio. Layout/UX virá depois.
> Dados de teste usados ao longo do documento.

## 1. Contexto

- Web app **mobile-first** (instalável como PWA) para agendamento de consultas.
- Agenda **única e compartilhada**: recepção e dentistas veem tudo, em tempo real.
- Objetivo: o profissional consegue marcar direto, sem depender da recepção responder,
  e todos enxergam quem está em qual sala em qualquer horário.

## 2. Funcionamento

| Item | Valor |
|---|---|
| Dias | Segunda a sábado |
| Horário | 08:00 às 20:00 |
| Granularidade da grade | 15 min (proposta) |
| Duração da consulta | Variável — estimativa definida no agendamento |
| Confirmação WhatsApp/SMS | Não |

## 3. Salas

Todas são salas odontológicas equivalentes (qualquer procedimento em qualquer sala).

| Sala | Uso preferencial |
|---|---|
| Sala 1 | Dr. Gleuberson e Dra. Laiane |
| Sala 2 | Rotativa — avulsos e "transbordo" |
| Sala 3 | Dr. Jackson e Dra. Laura |

**Sala preferencial não é reserva.** Ela é só a sugestão padrão. A sala só fica ocupada
quando existe uma consulta nela. Exemplo:

> 14:00 — Dr. Jackson atende na Sala 3, Dr. Gleuberson na Sala 1.
> Dra. Laura precisa atender às 14:00 → Sala 3 ocupada → sistema sugere a **Sala 2** (livre).

## 4. Profissionais

| Nome | Tipo | Sala preferencial |
|---|---|---|
| Dr. Jackson | Fixo | Sala 3 |
| Dra. Laura | Fixo | Sala 3 |
| Dr. Gleuberson | Fixo | Sala 1 |
| Dra. Laiane | Fixo | Sala 1 |
| (avulsos) | Avulso / rotativo | Sala 2 |

Avulsos são cadastrados normalmente; podem ser desativados quando não estão mais atendendo.

## 5. Perfis e permissões

Dois papéis: **RECEPÇÃO** e **DENTISTA**.

| Ação | Recepção | Dentista |
|---|---|---|
| Ver agenda completa (todas as salas/profissionais) | ✅ | ✅ |
| Criar consulta (para qualquer profissional, em sala livre) | ✅ | ✅ |
| Alterar / remarcar / cancelar consulta **que ele mesmo criou** | ✅ | ✅ |
| Alterar / remarcar / cancelar consulta **dele mesmo** (é o profissional da consulta) | ✅ | ✅ |
| Alterar / remarcar / cancelar consulta **de outro profissional, criada por outra pessoa** | ✅ | ❌ |
| Gerenciar profissionais, salas e usuários | ✅ (ou admin) | ❌ |

Regra resumida: **pode alterar quem criou a consulta, o profissional que vai atender,
ou a recepção.**

Exemplos:
- Dra. Laura marca um paciente dela → Laura e recepção podem alterar; Jackson só visualiza.
- Recepção marca paciente para o Dr. Jackson → recepção e Jackson podem alterar.

A regra é validada **no servidor/banco**, não só na tela.

## 6. Regras de conflito (garantidas pelo banco)

1. Uma sala não pode ter duas consultas sobrepostas.
2. Um profissional não pode ter duas consultas sobrepostas.
3. Consulta precisa estar dentro do horário de funcionamento (seg–sáb, 08–20h).
4. Concorrência: se duas pessoas tentam o mesmo horário ao mesmo tempo, a primeira
   grava e a segunda recebe "horário acabou de ser ocupado" e a agenda é atualizada.
5. Consultas canceladas não bloqueiam horário.

Quando o horário está indisponível, quem está marcando vê **quem ocupou e quem criou**,
podendo: contatar quem marcou, escolher outro horário, ou outra sala livre.

## 7. Fluxo de agendamento

```
1. Escolhe profissional + paciente + duração estimada (informada na hora)
2. Escolhe data/hora
3. Sistema sugere sala preferencial do profissional
      ├─ livre  → confirma
      └─ ocupada → sugere outra sala livre (normalmente Sala 3)
                   ou mostra próximos horários livres
4. Grava (validação de conflito + permissão no servidor)
5. Todos os aparelhos recebem a atualização em tempo real
```

## 8. Modelo de dados (conceitual)

```
sala            id, nome, ativa
profissional    id, nome, tipo (FIXO|AVULSO), sala_preferencial_id, cor, ativo
usuario         id, nome, email, papel (RECEPCAO|DENTISTA), profissional_id?
paciente        id, nome, telefone, observacoes
procedimento    (adiado — por ora a duração é informada pelo profissional)
consulta        id, paciente_id, profissional_id, sala_id,
                inicio, fim, observacoes,
                status (AGENDADA|CONFIRMADA|ATENDIDA|FALTOU|CANCELADA),
                criado_por (usuario_id), atualizado_por, criado_em, atualizado_em
historico       consulta_id, usuario_id, acao, antes, depois, quando
```

- `fim` = `inicio` + duração estimada, editável.
- `criado_por` é a base da regra de permissão.
- `historico` registra toda alteração (quem desmarcou, quem remarcou).

## 9. Calendário

- Calendário **dentro do app**, visão principal **diária**: 3 colunas (Sala 1, 2, 3)
  × linha do tempo 08–20h. Mostra quem está onde, a qualquer hora.
- Navegação por data (anterior / hoje / próximo / escolher no calendário).
- Filtro opcional por profissional ("minha agenda").
- Sem integração com calendário externo por enquanto.

## 9.1 Acesso

- Web app acessado por um **link** (navegador do celular ou computador), instalável
  na tela inicial como app (PWA). Nada de loja de aplicativos.
- **Cada pessoa tem login próprio** — necessário para saber quem marcou e aplicar
  as permissões.

## 10. Stack proposta

- Front: Next.js (PWA, mobile-first)
- Back/Banco: Supabase — Postgres (constraints de não-sobreposição), Auth,
  Row Level Security (permissões), Realtime (atualização ao vivo)

## 11. Em aberto

1. Dentista pode marcar paciente **para outro dentista**?
2. Profissional pode **bloquear horário** (folga, curso, almoço) sem paciente?
3. Sábado também vai até 20h? Feriados fecham?
4. Contas de usuário: quem cria (recepção/admin)? Auxiliares (ASB) terão acesso?
5. Avulsos têm login próprio ou a recepção marca por eles?
6. Intervalo entre consultas para limpeza/esterilização da sala?
7. Encaixe/urgência: permitir sobreposição para o mesmo profissional?
8. Status de chegada ("paciente chegou", "em atendimento")?
9. Cadastro de paciente: quais dados (nome, telefone, CPF?) — LGPD.
10. Aviso interno quando alguém marca/desmarca paciente seu?
