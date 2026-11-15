# Agenda Odontológica — Especificação Estrutural (v0.5)

> Princípio: **o mais simples possível.** É a agenda manuscrita da clínica, em versão digital,
> sem os problemas do papel. Layout/UX virá depois.

## 1. O problema da agenda de papel

- Cada folha é um dia, com horários de 30 em 30 minutos.
- Cada horário tem **uma linha só**. Quando dois profissionais atendem no mesmo horário
  em salas diferentes, não cabe: escreve-se em outro horário e puxa-se uma **setinha**.
- Resultado: um emaranhado de setas e anotações que confunde todo mundo.
- Além disso, só quem está com a agenda na mão sabe o que está marcado. O dentista que
  atende um paciente direto depende da recepção responder para marcar.

## 2. A solução

**A folha do dia ganha uma coluna por sala.** Cada horário tem espaço para as 3 salas,
lado a lado. Nada de setas.

```
 Sábado, 15/11            ◀ Hoje ▶
 ┌───────┬──────────────┬──────────────┬──────────────┐
 │       │ Sala 1       │ Sala 2       │ Sala 3       │
 ├───────┼──────────────┼──────────────┼──────────────┤
 │ 16:00 │ Maria        │              │ (livre)      │
 │       │ Dr. Gleuberson│             │              │
 │ 16:30 │ ▼ (continua) │ Pedro        │ Ana          │
 │       │              │ Dra. Laura   │ Dr. Jackson  │
 │ 17:00 │ (livre)      │ ▼            │ ● em atend.  │
 │ 17:30 │ ░ Dra. Laiane│ (livre)      │ (livre)      │
 │       │ ░ bloqueado  │              │              │
 └───────┴──────────────┴──────────────┴──────────────┘
```

- Linhas de **30 em 30 minutos**, das 08:00 às 20:00.
- Uma consulta pode ocupar **mais de uma linha** (ex.: 16:30–17:30), sem precisar reescrever.
- Cada cartão mostra o **primeiro nome do paciente**, o **profissional** (com a cor dele) e o
  **status**.
- Todos veem a mesma folha, ao vivo, no celular.

## 3. Funcionamento

| Item | Valor |
|---|---|
| Dias | Segunda a sábado |
| Horário | 08:00 às 20:00 (sábado incluso) |
| Feriados | A folha mostra "Feriado", mas **não bloqueia**: marca quem quiser |
| Grade | 30 em 30 minutos |
| Duração | Escolhida ao marcar (30 min, 1h, 1h30…) |
| Intervalo entre consultas | Não |
| Encaixe/urgência | Não (o sistema nunca deixa sobrepor) |
| Confirmação WhatsApp/SMS | Não |

## 4. Salas

Todas odontológicas e equivalentes.

| Sala | Uso preferencial |
|---|---|
| Sala 1 | Dr. Gleuberson e Dra. Laiane |
| Sala 2 | Rotativa: avulsos e quando as outras estão ocupadas |
| Sala 3 | Dr. Jackson e Dra. Laura |

A sala preferencial é só a **sugestão** ao marcar. Se estiver ocupada naquele horário, o
sistema sugere outra sala livre.

> 16:30: Dr. Jackson já está na Sala 3. Dra. Laura também precisa atender às 16:30.
> O sistema sugere a **Sala 2**.

## 5. Pessoas e acesso

| Quem | Login? | Observação |
|---|---|---|
| Recepção | ✅ | Marca para todos, inclusive avulsos |
| Dr. Jackson, Dra. Laura, Dr. Gleuberson, Dra. Laiane | ✅ (cada um o seu) | |
| Avulsos | ❌ | São só um nome na lista; a recepção marca por eles |
| Auxiliares | ❌ | Não usam o sistema |

Acesso por um **link** no navegador do celular ou do computador, que pode ser adicionado à
tela inicial como se fosse um app. Não precisa de loja de aplicativos.

## 6. Permissões

| Ação | Recepção | Dentista fixo |
|---|---|---|
| Ver a folha do dia (todas as salas) | ✅ | ✅ |
| Marcar consulta | ✅ (para qualquer um, inclusive avulsos) | ✅ (para si ou outro fixo) |
| Alterar/desmarcar consulta que **ele marcou** | ✅ | ✅ |
| Alterar/desmarcar consulta **dele** (ele é quem atende) | ✅ | ✅ |
| Alterar/desmarcar consulta de outro dentista, marcada por outra pessoa | ✅ | ❌ (só vê) |
| Ver procedimento/observação | ✅ | ✅ (todas) |
| Ver **pagamento** (forma/valor) | ✅ todas | Só das consultas **dele** |
| Bloquear período (curso, folga) | ✅ | ✅ só o dele |
| Atualizar status (chegou, em atendimento…) | ✅ | ✅ das dele |
| Cadastrar avulsos/usuários | ✅ | ❌ |

Exemplos:
- Dra. Laura marca um paciente dela: Laura e recepção alteram. Jackson só vê.
- A recepção marca um paciente para o Dr. Jackson: Jackson e recepção alteram.
- Dr. Jackson vê o horário da Laura ocupado, mas **não vê** o pagamento da consulta dela.

As regras ficam **no servidor**, não só na tela.

## 7. Consulta

Só o que hoje se escreve no papel:

| Campo | Obrigatório | Exemplo |
|---|---|---|
| Nome do paciente | ✅ | "Maria" |
| Profissional | ✅ | Dr. Gleuberson |
| Sala | ✅ (sugerida) | Sala 1 |
| Início + duração | ✅ | 16:00, 1h |
| Procedimento / observação | — | "Restauração 26" |
| Pagamento | — | ver abaixo |

Não existe cadastro de pacientes, só o nome escrito na consulta.

### Pagamento

Visível **só para a recepção e para o profissional que atende**. Pode ser combinado, em
várias partes:

| Forma | Valor | Parcelas |
|---|---|---|
| Pix (entrada) | R$ 500,00 | — |
| Cartão de crédito | R$ 2.000,00 | 10x |

Formas: Pix, Dinheiro, Cartão de débito, Cartão de crédito (com nº de parcelas).
O total é a soma das partes.

## 8. Status: "quem está onde agora"

```
AGENDADO → CHEGOU (na clínica) → EM ATENDIMENTO → FINALIZADO
        ↘ FALTOU
        ↘ DESMARCADO (some da folha e libera o horário)
```

Ao olhar a folha, qualquer um vê na hora:
- **Em atendimento**: o profissional está na sala com o paciente.
- **Chegou**: o paciente está aguardando.
- **Atrasado**: já passou do horário e ninguém mudou o status. O profissional
  *deveria estar* atendendo.

## 9. Bloqueio de período

- O dentista (ou a recepção) bloqueia um período: **curso, folga, ausência**.
- O bloqueio é **do profissional**, não da sala. Nesse período o sistema não deixa marcar
  para ele.
- Na folha, aparece como uma faixa "Dra. Laiane: bloqueado".

## 10. Regras que o sistema garante

1. Uma sala não tem duas consultas ao mesmo tempo.
2. Um profissional não tem duas consultas ao mesmo tempo, nem consulta durante um bloqueio.
3. Só de segunda a sábado, das 08:00 às 20:00.
4. Se duas pessoas tentam o mesmo horário ao mesmo tempo, só a primeira consegue. A outra
   recebe um aviso e a folha se atualiza.
5. Horário ocupado mostra **quem marcou**. Quem está marcando pode falar com essa pessoa,
   escolher outro horário ou outra sala.
6. Toda alteração fica registrada (quem, o quê, quando).

## 11. Modelo de dados

```
sala          id, nome, ativa
profissional  id, nome, tipo (FIXO|AVULSO), sala_preferencial_id, cor, ativo
usuario       id, nome, email, papel (RECEPCAO|DENTISTA), profissional_id?
consulta      id, paciente_nome, profissional_id, sala_id, inicio, fim,
              procedimento_obs, status,
              criado_por, atualizado_por, criado_em, atualizado_em
pagamento     id, consulta_id, forma (PIX|DINHEIRO|DEBITO|CREDITO), valor, parcelas
              (várias linhas por consulta; tabela separada para restringir quem vê)
feriado       data, nome   (nacionais automáticos; recepção pode incluir locais)
bloqueio      id, profissional_id, inicio, fim, motivo, criado_por
historico     consulta_id, usuario_id, acao, antes, depois, quando
```

## 12. Stack

- Front: Next.js (site instalável, mobile-first)
- Banco/servidor: Supabase (Postgres + login + permissões por linha + atualização ao vivo)

## 13. Em aberto

Nada de estrutural. Próximo passo: banco de dados + primeira versão da folha do dia.
