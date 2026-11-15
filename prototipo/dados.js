/*
 * Camada de dados do protótipo.
 * Hoje grava no navegador (localStorage). Em produção esta camada passa a
 * falar com o Supabase, mantendo a mesma interface para a tela.
 * Toda escrita relê os dados antes de gravar, como faria um servidor, para
 * que duas abas abertas simulem dois aparelhos disputando o mesmo horário.
 */
(function (raiz) {
  'use strict';

  const R = typeof module !== 'undefined' && module.exports ? require('./regras.js') : raiz.Regras;
  const CHAVE = 'agenda-odonto-prototipo-v1';

  class ErroAgenda extends Error {
    constructor(mensagem, detalhes) {
      super(mensagem);
      this.detalhes = detalhes || null;
    }
  }

  function criarArmazenamento(storage) {
    let memoria = null;
    return {
      ler() {
        try {
          const t = storage && storage.getItem(CHAVE);
          if (t) return JSON.parse(t);
        } catch (e) { /* sem acesso ao armazenamento */ }
        return memoria ? JSON.parse(JSON.stringify(memoria)) : null;
      },
      gravar(db) {
        memoria = db;
        try { storage && storage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { /* segue em memória */ }
      },
      limpar() {
        memoria = null;
        try { storage && storage.removeItem(CHAVE); } catch (e) { /* ignore */ }
      },
    };
  }

  /* ---------- dados de exemplo ---------- */

  function semente(dia, agoraMin, ehHoje) {
    const salas = [
      { id: 's1', nome: 'Sala 1', ativa: true },
      { id: 's2', nome: 'Sala 2', ativa: true },
      { id: 's3', nome: 'Sala 3', ativa: true },
    ];
    const profissionais = [
      { id: 'p-gleuberson', nome: 'Dr. Gleuberson', curto: 'Gleuberson', tipo: 'FIXO', salaPreferencialId: 's1', cor: '#2f7d6d', ativo: true },
      { id: 'p-laiane', nome: 'Dra. Laiane', curto: 'Laiane', tipo: 'FIXO', salaPreferencialId: 's1', cor: '#b5557a', ativo: true },
      { id: 'p-jackson', nome: 'Dr. Jackson', curto: 'Jackson', tipo: 'FIXO', salaPreferencialId: 's3', cor: '#3d68b8', ativo: true },
      { id: 'p-laura', nome: 'Dra. Laura', curto: 'Laura', tipo: 'FIXO', salaPreferencialId: 's3', cor: '#c07a1f', ativo: true },
      { id: 'p-marcos', nome: 'Dr. Marcos (avulso)', curto: 'Marcos', tipo: 'AVULSO', salaPreferencialId: 's2', cor: '#6b6f7a', ativo: true },
      { id: 'p-bianca', nome: 'Dra. Bianca (avulsa)', curto: 'Bianca', tipo: 'AVULSO', salaPreferencialId: 's2', cor: '#7a5fb0', ativo: true },
    ];
    const usuarios = [
      { id: 'u-recepcao', nome: 'Recepção', papel: 'RECEPCAO', profissionalId: null },
      { id: 'u-gleuberson', nome: 'Dr. Gleuberson', papel: 'DENTISTA', profissionalId: 'p-gleuberson' },
      { id: 'u-laiane', nome: 'Dra. Laiane', papel: 'DENTISTA', profissionalId: 'p-laiane' },
      { id: 'u-jackson', nome: 'Dr. Jackson', papel: 'DENTISTA', profissionalId: 'p-jackson' },
      { id: 'u-laura', nome: 'Dra. Laura', papel: 'DENTISTA', profissionalId: 'p-laura' },
    ];

    const h = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
    const amanha = R.somarDias(dia, R.diaDaSemana(dia) === 6 ? 2 : 1);
    const linhas = [
      // [data, sala, profissional, paciente, inicio, fim, procedimento, quem marcou, pagamento]
      [dia, 's1', 'p-gleuberson', 'Carlos', '08:00', '09:00', 'Avaliação', 'u-recepcao', [{ forma: 'PIX', valor: 150 }]],
      [dia, 's3', 'p-jackson', 'Fernanda', '08:30', '10:00', 'Canal 36 (2ª sessão)', 'u-jackson', [{ forma: 'PIX', valor: 500 }, { forma: 'CREDITO', valor: 1000, parcelas: 10 }]],
      [dia, 's2', 'p-laura', 'Roberto', '09:00', '10:00', 'Limpeza', 'u-laura', [{ forma: 'DINHEIRO', valor: 200 }]],
      [dia, 's1', 'p-laiane', 'Juliana', '10:00', '11:00', 'Clareamento: moldagem', 'u-recepcao', null],
      [dia, 's3', 'p-laura', 'Pedro', '10:30', '11:30', 'Restauração 26', 'u-recepcao', [{ forma: 'DEBITO', valor: 280 }]],
      [dia, 's2', 'p-marcos', 'Sônia', '11:00', '12:00', 'Extração 38', 'u-recepcao', null],
      [dia, 's1', 'p-gleuberson', 'Lucas', '14:00', '15:00', 'Manutenção ortodôntica', 'u-gleuberson', null],
      [dia, 's3', 'p-jackson', 'Ana', '14:00', '15:30', 'Coroa: prova', 'u-recepcao', [{ forma: 'PIX', valor: 800 }, { forma: 'CREDITO', valor: 2000, parcelas: 10 }]],
      [dia, 's2', 'p-laura', 'Paula', '14:30', '15:30', 'Avaliação', 'u-laura', null],
      [dia, 's1', 'p-gleuberson', 'Maria', '16:30', '17:30', 'Resina 11 e 21', 'u-recepcao', null],
      [dia, 's2', 'p-bianca', 'Rafael', '16:30', '17:00', 'Avaliação', 'u-recepcao', null],
      [dia, 's3', 'p-laura', 'Beatriz', '16:30', '18:00', 'Canal 46', 'u-laura', null],
      [dia, 's3', 'p-jackson', 'Thiago', '18:00', '19:00', 'Restauração 15', 'u-jackson', null],
      [amanha, 's3', 'p-jackson', 'Marcelo', '09:00', '10:00', 'Avaliação', 'u-recepcao', null],
      [amanha, 's1', 'p-laiane', 'Camila', '09:00', '10:30', 'Clareamento: entrega', 'u-laiane', null],
      [amanha, 's2', 'p-marcos', 'Jorge', '15:00', '16:00', 'Extração 48', 'u-recepcao', null],
    ];

    const consultas = [];
    const pagamentos = {};
    const historico = [];
    let n = 0;
    for (const [data, salaId, profissionalId, paciente, ini, fim, proc, criadoPor, pg] of linhas) {
      const id = `c${++n}`;
      const inicio = h(ini), termino = h(fim);
      let status = 'AGENDADO';
      if (ehHoje && data === dia) {
        if (termino <= agoraMin) status = paciente === 'Sônia' ? 'FALTOU' : 'FINALIZADO';
        else if (inicio <= agoraMin) status = 'EM_ATENDIMENTO';
      }
      consultas.push({
        id, data, salaId, profissionalId, paciente, inicio, fim: termino,
        procedimento: proc, status, criadoPor, atualizadoPor: criadoPor,
        criadoEm: new Date().toISOString(), versao: 1,
      });
      if (pg) pagamentos[id] = pg;
      historico.push({ consultaId: id, usuarioId: criadoPor, acao: 'Marcou', quando: new Date().toISOString() });
    }

    const bloqueios = [
      { id: 'b1', profissionalId: 'p-laiane', data: dia, inicio: h('14:00'), fim: h('18:00'), motivo: 'Curso', criadoPor: 'u-laiane' },
    ];

    return { versaoEsquema: 1, salas, profissionais, usuarios, consultas, pagamentos, bloqueios, historico, seq: 100 };
  }

  /* ---------- API ---------- */

  function criarAgenda(opcoes) {
    const arm = criarArmazenamento(opcoes && opcoes.storage);
    const relogio = (opcoes && opcoes.agora) || (() => new Date());

    function novoId(db, prefixo) {
      db.seq = (db.seq || 100) + 1;
      return `${prefixo}${db.seq}-${Date.now().toString(36)}`;
    }

    function db() {
      const d = arm.ler();
      if (!d) throw new ErroAgenda('Agenda não iniciada.');
      return d;
    }

    function nomeUsuario(d, id) {
      const u = d.usuarios.find((x) => x.id === id);
      return u ? u.nome : 'Alguém';
    }

    function registrar(d, consultaId, usuarioId, acao) {
      d.historico.push({ consultaId, usuarioId, acao, quando: relogio().toISOString() });
    }

    function exigirUsuario(d, usuario) {
      const u = usuario && d.usuarios.find((x) => x.id === usuario.id);
      if (!u) throw new ErroAgenda('Entre com um usuário para continuar.');
      return u;
    }

    function descreverConflitos(d, lista) {
      return lista.map((c) => {
        if (c.tipo === 'bloqueio') {
          const p = d.profissionais.find((x) => x.id === c.bloqueio.profissionalId);
          return `${p ? p.nome : 'Profissional'} está bloqueado das ${R.hhmm(c.bloqueio.inicio)} às ${R.hhmm(c.bloqueio.fim)} (${c.bloqueio.motivo}).`;
        }
        const o = c.consulta;
        const p = d.profissionais.find((x) => x.id === o.profissionalId);
        const s = d.salas.find((x) => x.id === o.salaId);
        const quem = nomeUsuario(d, o.criadoPor);
        const faixa = `${R.hhmm(o.inicio)} às ${R.hhmm(o.fim)}`;
        return c.tipo === 'sala'
          ? `${s.nome} está ocupada das ${faixa}: ${o.paciente} com ${p.nome}. Marcado por ${quem}.`
          : `${p.nome} já atende ${o.paciente} das ${faixa} na ${s.nome}. Marcado por ${quem}.`;
      });
    }

    return {
      ErroAgenda,

      iniciar() {
        if (arm.ler()) return;
        const agora = relogio();
        const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
        const dia = R.diaAberto(hoje) ? hoje : R.somarDias(hoje, 1);
        arm.gravar(semente(dia, agora.getHours() * 60 + agora.getMinutes(), dia === hoje));
      },

      restaurarExemplo() {
        arm.limpar();
        this.iniciar();
      },

      salas: () => db().salas,
      profissionais: () => db().profissionais,
      usuarios: () => db().usuarios,
      usuario: (id) => db().usuarios.find((u) => u.id === id) || null,
      nomeUsuario: (id) => nomeUsuario(db(), id),

      consultasDoDia(data) {
        return db().consultas.filter((c) => c.data === data && c.status !== 'DESMARCADO');
      },

      consulta(id) {
        return db().consultas.find((c) => c.id === id) || null;
      },

      bloqueiosDoDia(data) {
        return db().bloqueios.filter((b) => b.data === data);
      },

      historico(consultaId) {
        const d = db();
        return d.historico
          .filter((h) => h.consultaId === consultaId)
          .map((h) => ({ ...h, usuario: nomeUsuario(d, h.usuarioId) }));
      },

      /** Pagamento da consulta, ou null se o usuário não pode ver. */
      pagamento(usuario, consultaId) {
        const d = db();
        const c = d.consultas.find((x) => x.id === consultaId);
        if (!c || !R.podeVerPagamento(usuario, c)) return null;
        return d.pagamentos[consultaId] || [];
      },

      /** Mensagens legíveis para os conflitos de uma consulta em rascunho. */
      verificar(rascunho) {
        const d = db();
        const erroHorario = R.validarHorario(rascunho);
        if (erroHorario) return { erro: erroHorario, conflitos: [] };
        const lista = R.conflitos(rascunho, d.consultas, d.bloqueios);
        return { erro: null, conflitos: descreverConflitos(d, lista), brutos: lista };
      },

      /**
       * Cria (sem id) ou altera (com id) uma consulta.
       * `dados.versao` deve vir na alteração: protege contra edição simultânea.
       * `dados.pagamento` é ignorado se o usuário não pode ver o pagamento.
       */
      salvarConsulta(usuario, dados) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        const prof = d.profissionais.find((p) => p.id === dados.profissionalId);
        const paciente = (dados.paciente || '').trim();
        if (!paciente) throw new ErroAgenda('Escreva o nome do paciente.');
        if (!prof) throw new ErroAgenda('Escolha o profissional.');
        if (!d.salas.some((s) => s.id === dados.salaId)) throw new ErroAgenda('Escolha a sala.');

        let atual = null;
        if (dados.id) {
          atual = d.consultas.find((c) => c.id === dados.id);
          if (!atual || atual.status === 'DESMARCADO') throw new ErroAgenda('Essa consulta não existe mais.');
          if (!R.podeEditar(u, atual)) throw new ErroAgenda('Você não pode alterar esta consulta. Fale com a recepção ou com quem marcou.');
          if (dados.versao !== atual.versao) {
            throw new ErroAgenda(`${nomeUsuario(d, atual.atualizadoPor)} alterou esta consulta enquanto você editava. Abra de novo para ver a versão atual.`);
          }
          if (prof.id !== atual.profissionalId && !R.podeMarcarPara(u, prof)) {
            throw new ErroAgenda('Você não pode marcar para esse profissional.');
          }
        } else if (!R.podeMarcarPara(u, prof)) {
          throw new ErroAgenda(prof.tipo === 'AVULSO'
            ? 'Só a recepção marca para profissionais avulsos.'
            : 'Você não pode marcar para esse profissional.');
        }

        const nova = {
          ...(atual || { criadoPor: u.id, criadoEm: relogio().toISOString(), status: 'AGENDADO', versao: 0 }),
          id: atual ? atual.id : novoId(d, 'c'),
          paciente,
          profissionalId: prof.id,
          salaId: dados.salaId,
          data: dados.data,
          inicio: Number(dados.inicio),
          fim: Number(dados.fim),
          procedimento: (dados.procedimento || '').trim(),
          atualizadoPor: u.id,
        };
        nova.versao = (atual ? atual.versao : 0) + 1;

        const erroHorario = R.validarHorario(nova);
        if (erroHorario) throw new ErroAgenda(erroHorario);
        const lista = R.conflitos(nova, d.consultas, d.bloqueios);
        if (lista.length) {
          const sala = R.sugerirSala(prof, nova, d.salas, d.consultas);
          throw new ErroAgenda('Horário indisponível.', {
            conflitos: descreverConflitos(d, lista),
            salaSugerida: lista.every((c) => c.tipo === 'sala') ? sala : null,
          });
        }

        if (dados.pagamento !== undefined && R.podeVerPagamento(u, nova)) {
          const pg = (dados.pagamento || []).map((p) => ({
            forma: p.forma, valor: Number(p.valor), parcelas: p.forma === 'CREDITO' ? Number(p.parcelas) || 1 : 1,
          }));
          const erroPg = R.validarPagamento(pg);
          if (erroPg) throw new ErroAgenda(erroPg);
          if (pg.length) d.pagamentos[nova.id] = pg; else delete d.pagamentos[nova.id];
        }

        if (atual) {
          const mudancas = [];
          if (atual.data !== nova.data || atual.inicio !== nova.inicio || atual.fim !== nova.fim) {
            mudancas.push(`horário ${R.hhmm(atual.inicio)} → ${R.hhmm(nova.inicio)}${atual.data !== nova.data ? ` (${nova.data.split('-').reverse().join('/')})` : ''}`);
          }
          if (atual.salaId !== nova.salaId) mudancas.push(`sala → ${d.salas.find((s) => s.id === nova.salaId).nome}`);
          if (atual.profissionalId !== nova.profissionalId) mudancas.push(`profissional → ${prof.nome}`);
          if (atual.paciente !== nova.paciente) mudancas.push(`paciente → ${nova.paciente}`);
          Object.assign(atual, nova);
          registrar(d, nova.id, u.id, mudancas.length ? `Alterou ${mudancas.join(', ')}` : 'Alterou detalhes');
        } else {
          d.consultas.push(nova);
          registrar(d, nova.id, u.id, 'Marcou');
        }
        arm.gravar(d);
        return nova;
      },

      mudarStatus(usuario, id, status) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        const c = d.consultas.find((x) => x.id === id);
        if (!c || c.status === 'DESMARCADO') throw new ErroAgenda('Essa consulta não existe mais.');
        if (!R.STATUS.includes(status)) throw new ErroAgenda('Status inválido.');
        if (!R.podeEditar(u, c)) throw new ErroAgenda('Você não pode alterar esta consulta.');
        if (c.status === status) return c;
        c.status = status;
        c.atualizadoPor = u.id;
        c.versao += 1;
        const nomes = { AGENDADO: 'Agendado', CHEGOU: 'Chegou', EM_ATENDIMENTO: 'Em atendimento', FINALIZADO: 'Finalizado', FALTOU: 'Faltou', DESMARCADO: 'Desmarcou' };
        registrar(d, id, u.id, status === 'DESMARCADO' ? 'Desmarcou' : `Status: ${nomes[status]}`);
        arm.gravar(d);
        return c;
      },

      desmarcar(usuario, id) {
        return this.mudarStatus(usuario, id, 'DESMARCADO');
      },

      criarBloqueio(usuario, dados) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        if (!R.podeBloquear(u, dados.profissionalId)) throw new ErroAgenda('Você só pode bloquear a sua própria agenda.');
        const b = {
          id: novoId(d, 'b'),
          profissionalId: dados.profissionalId,
          data: dados.data,
          inicio: Number(dados.inicio),
          fim: Number(dados.fim),
          motivo: (dados.motivo || '').trim() || 'Ausência',
          criadoPor: u.id,
        };
        const erroHorario = R.validarHorario(b);
        if (erroHorario) throw new ErroAgenda(erroHorario);
        const comPaciente = d.consultas.filter((c) => c.status !== 'DESMARCADO' && c.profissionalId === b.profissionalId && R.sobrepoe(c, b));
        if (comPaciente.length) {
          throw new ErroAgenda('Há pacientes marcados nesse período. Remarque antes de bloquear.', {
            conflitos: comPaciente.map((c) => `${R.hhmm(c.inicio)}–${R.hhmm(c.fim)}: ${c.paciente}`),
          });
        }
        if (d.bloqueios.some((x) => x.profissionalId === b.profissionalId && R.sobrepoe(x, b))) {
          throw new ErroAgenda('Já existe um bloqueio nesse período.');
        }
        d.bloqueios.push(b);
        arm.gravar(d);
        return b;
      },

      removerBloqueio(usuario, id) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        const b = d.bloqueios.find((x) => x.id === id);
        if (!b) return;
        if (!R.podeRemoverBloqueio(u, b)) throw new ErroAgenda('Você não pode remover este bloqueio.');
        d.bloqueios = d.bloqueios.filter((x) => x.id !== id);
        arm.gravar(d);
      },

      adicionarAvulso(usuario, nome) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        if (!R.podeGerenciarEquipe(u)) throw new ErroAgenda('Só a recepção cadastra profissionais.');
        const limpo = (nome || '').trim();
        if (!limpo) throw new ErroAgenda('Escreva o nome do profissional.');
        const cores = ['#8a6d3b', '#4f7f3a', '#a04a3c', '#3c7f8f', '#7c5a8f'];
        const p = {
          id: novoId(d, 'p'),
          nome: limpo,
          curto: limpo.replace(/^(Dra?\.)\s*/i, '').split(' ')[0],
          tipo: 'AVULSO',
          salaPreferencialId: 's2',
          cor: cores[d.profissionais.length % cores.length],
          ativo: true,
        };
        d.profissionais.push(p);
        arm.gravar(d);
        return p;
      },

      alternarAtivo(usuario, profissionalId) {
        const d = db();
        const u = exigirUsuario(d, usuario);
        if (!R.podeGerenciarEquipe(u)) throw new ErroAgenda('Só a recepção altera a equipe.');
        const p = d.profissionais.find((x) => x.id === profissionalId);
        if (!p || p.tipo !== 'AVULSO') throw new ErroAgenda('Só profissionais avulsos podem ser desativados.');
        p.ativo = !p.ativo;
        arm.gravar(d);
        return p;
      },
    };
  }

  const api = { criarAgenda, ErroAgenda, semente, CHAVE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Dados = api;
})(typeof window !== 'undefined' ? window : globalThis);
