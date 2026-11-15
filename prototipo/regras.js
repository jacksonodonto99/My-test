/*
 * Regras de negócio da agenda (sem tela, sem banco).
 * Funções puras: recebem dados e devolvem respostas. As mesmas regras
 * serão repetidas no banco (Supabase) quando o sistema for para produção.
 *
 * Convenções:
 *   data   -> "AAAA-MM-DD" (horário local da clínica)
 *   inicio -> minutos desde 00:00 (ex.: 16:30 = 990)
 *   fim    -> minutos desde 00:00, exclusivo
 */
(function (raiz) {
  'use strict';

  const ABRE = 8 * 60;      // 08:00
  const FECHA = 20 * 60;    // 20:00
  const PASSO = 30;         // grade de 30 min
  const TOLERANCIA_ATRASO = 10; // min após o início para considerar atrasado

  const STATUS = ['AGENDADO', 'CHEGOU', 'EM_ATENDIMENTO', 'FINALIZADO', 'FALTOU', 'DESMARCADO'];
  const FORMAS = ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO'];

  /* ---------- datas e horas ---------- */

  function partes(data) {
    const [a, m, d] = data.split('-').map(Number);
    return { a, m, d };
  }

  function paraData(a, m, d) {
    return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function diaDaSemana(data) {
    const { a, m, d } = partes(data);
    return new Date(a, m - 1, d).getDay(); // 0 = domingo
  }

  function somarDias(data, n) {
    const { a, m, d } = partes(data);
    const dt = new Date(a, m - 1, d + n);
    return paraData(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  function diaAberto(data) {
    return diaDaSemana(data) !== 0;
  }

  function hhmm(min) {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }

  function horarios() {
    const lista = [];
    for (let m = ABRE; m < FECHA; m += PASSO) lista.push(m);
    return lista;
  }

  /* ---------- feriados nacionais ---------- */

  function pascoa(ano) {
    // Algoritmo de Meeus/Jones/Butcher
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return paraData(ano, mes, dia);
  }

  function feriados(ano) {
    const p = pascoa(ano);
    const lista = {
      [paraData(ano, 1, 1)]: 'Confraternização Universal',
      [somarDias(p, -48)]: 'Carnaval (ponto facultativo)',
      [somarDias(p, -47)]: 'Carnaval (ponto facultativo)',
      [somarDias(p, -2)]: 'Sexta-feira Santa',
      [paraData(ano, 4, 21)]: 'Tiradentes',
      [paraData(ano, 5, 1)]: 'Dia do Trabalho',
      [somarDias(p, 60)]: 'Corpus Christi (ponto facultativo)',
      [paraData(ano, 9, 7)]: 'Independência do Brasil',
      [paraData(ano, 10, 12)]: 'Nossa Senhora Aparecida',
      [paraData(ano, 11, 2)]: 'Finados',
      [paraData(ano, 11, 15)]: 'Proclamação da República',
      [paraData(ano, 11, 20)]: 'Dia da Consciência Negra',
      [paraData(ano, 12, 25)]: 'Natal',
    };
    return lista;
  }

  /** Nome do feriado nacional na data, ou null. Feriado não bloqueia agenda. */
  function feriado(data) {
    return feriados(partes(data).a)[data] || null;
  }

  /* ---------- horários e conflitos ---------- */

  function sobrepoe(a, b) {
    return a.data === b.data && a.inicio < b.fim && b.inicio < a.fim;
  }

  /** Devolve uma mensagem de erro, ou null se o horário é válido. */
  function validarHorario({ data, inicio, fim }) {
    if (!data || inicio == null || fim == null) return 'Informe data, início e duração.';
    if (!diaAberto(data)) return 'A clínica não abre aos domingos.';
    if (inicio % PASSO || fim % PASSO) return 'Use horários de 30 em 30 minutos.';
    if (fim <= inicio) return 'O término precisa ser depois do início.';
    if (inicio < ABRE || fim > FECHA) return 'Fora do horário de funcionamento (08:00 às 20:00).';
    return null;
  }

  function ativa(c) {
    return c.status !== 'DESMARCADO';
  }

  /**
   * Lista o que impede a consulta `c` de ser gravada:
   *   { tipo: 'sala' | 'profissional', consulta }  ou  { tipo: 'bloqueio', bloqueio }
   */
  function conflitos(c, consultas, bloqueios) {
    const lista = [];
    for (const o of consultas) {
      if (o.id === c.id || !ativa(o) || !sobrepoe(o, c)) continue;
      if (o.salaId === c.salaId) lista.push({ tipo: 'sala', consulta: o });
      if (o.profissionalId === c.profissionalId) lista.push({ tipo: 'profissional', consulta: o });
    }
    for (const b of bloqueios || []) {
      if (b.profissionalId === c.profissionalId && sobrepoe(b, c)) lista.push({ tipo: 'bloqueio', bloqueio: b });
    }
    return lista;
  }

  function salaLivre(salaId, alvo, consultas) {
    return !consultas.some((o) => o.id !== alvo.id && ativa(o) && o.salaId === salaId && sobrepoe(o, alvo));
  }

  /**
   * Sala sugerida para o profissional no horário:
   * a preferencial dele se estiver livre; senão a primeira livre; senão null.
   */
  function sugerirSala(profissional, alvo, salas, consultas) {
    const ativas = salas.filter((s) => s.ativa !== false);
    const ordem = [
      ...ativas.filter((s) => profissional && s.id === profissional.salaPreferencialId),
      ...ativas.filter((s) => !profissional || s.id !== profissional.salaPreferencialId),
    ];
    const livre = ordem.find((s) => salaLivre(s.id, alvo, consultas));
    return livre ? livre.id : null;
  }

  /* ---------- permissões ---------- */

  function ehRecepcao(u) {
    return !!u && u.papel === 'RECEPCAO';
  }

  function ehDoProfissional(u, profissionalId) {
    return !!u && !!u.profissionalId && u.profissionalId === profissionalId;
  }

  /** Recepção marca para qualquer profissional ativo; dentista, só para fixos. */
  function podeMarcarPara(u, p) {
    if (!u || !p || !p.ativo) return false;
    if (ehRecepcao(u)) return true;
    return u.papel === 'DENTISTA' && p.tipo === 'FIXO';
  }

  /** Pode alterar: recepção, quem marcou, ou o profissional que atende. */
  function podeEditar(u, c) {
    return ehRecepcao(u) || (!!u && c.criadoPor === u.id) || ehDoProfissional(u, c.profissionalId);
  }

  /** Pagamento: só recepção e o profissional que atende. */
  function podeVerPagamento(u, c) {
    return ehRecepcao(u) || ehDoProfissional(u, c.profissionalId);
  }

  function podeBloquear(u, profissionalId) {
    return ehRecepcao(u) || ehDoProfissional(u, profissionalId);
  }

  function podeRemoverBloqueio(u, b) {
    return ehRecepcao(u) || (!!u && b.criadoPor === u.id) || ehDoProfissional(u, b.profissionalId);
  }

  function podeGerenciarEquipe(u) {
    return ehRecepcao(u);
  }

  /* ---------- status ---------- */

  /** Status mostrado na folha: acrescenta ATRASADO (calculado, nunca gravado). */
  function statusExibido(c, agora) {
    if (c.status === 'AGENDADO' && agora && c.data === agora.data && agora.min >= c.inicio + TOLERANCIA_ATRASO) {
      return 'ATRASADO';
    }
    return c.status;
  }

  /* ---------- pagamento ---------- */

  /** Valida as partes do pagamento. Devolve mensagem de erro ou null. */
  function validarPagamento(partesPg) {
    if (!Array.isArray(partesPg)) return 'Pagamento inválido.';
    for (const p of partesPg) {
      if (!FORMAS.includes(p.forma)) return 'Escolha a forma de pagamento.';
      if (!(typeof p.valor === 'number' && p.valor > 0)) return 'Informe um valor maior que zero.';
      const parcelas = p.parcelas || 1;
      if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return 'Parcelas: de 1 a 24.';
      if (p.forma !== 'CREDITO' && parcelas !== 1) return 'Só cartão de crédito pode ser parcelado.';
    }
    return null;
  }

  function totalPagamento(partesPg) {
    return (partesPg || []).reduce((s, p) => s + p.valor, 0);
  }

  const api = {
    ABRE, FECHA, PASSO, STATUS, FORMAS,
    diaDaSemana, somarDias, diaAberto, hhmm, horarios,
    pascoa, feriados, feriado,
    sobrepoe, validarHorario, conflitos, salaLivre, sugerirSala,
    ehRecepcao, podeMarcarPara, podeEditar, podeVerPagamento,
    podeBloquear, podeRemoverBloqueio, podeGerenciarEquipe,
    statusExibido, validarPagamento, totalPagamento,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis);
