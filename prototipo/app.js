/* Tela do protótipo: folha do dia, marcação, detalhe, bloqueio e equipe. */
(function () {
  'use strict';

  const R = window.Regras;
  document.documentElement.lang = 'pt-BR';
  const agenda = window.Dados.criarAgenda({ storage: armazenamento() });
  agenda.iniciar();

  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const NOME_STATUS = {
    AGENDADO: 'Agendado', CHEGOU: 'Chegou', EM_ATENDIMENTO: 'Em atendimento',
    FINALIZADO: 'Finalizado', FALTOU: 'Faltou', ATRASADO: 'Atrasado',
  };
  const STATUS_CURTO = { ...NOME_STATUS, EM_ATENDIMENTO: 'Atendendo' };
  const NOME_FORMA = { PIX: 'Pix', DINHEIRO: 'Dinheiro', DEBITO: 'Débito', CREDITO: 'Crédito' };
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const app = document.getElementById('app');
  const painel = document.getElementById('painel');
  const painelCorpo = document.getElementById('painel-corpo');
  const painelTitulo = document.getElementById('painel-titulo');
  const aviso = document.getElementById('aviso');

  const est = {
    usuarioId: pref('usuario'),
    data: diaInicial(),
    soMinha: pref('soMinha') === '1',
    rolouParaAgora: false,
    painelAtual: null, // { tipo, id } para atualizar quando outro aparelho mudar algo
  };

  /* ---------- utilidades ---------- */

  function armazenamento() {
    try { const s = window.localStorage; s.getItem('teste'); return s; } catch (e) { return null; }
  }
  function pref(k) { try { return localStorage.getItem('agenda-pref-' + k); } catch (e) { return null; } }
  function salvarPref(k, v) { try { localStorage.setItem('agenda-pref-' + k, v); } catch (e) { /* ignore */ } }

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function hojeStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function agoraMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function diaInicial() { const h = hojeStr(); return R.diaAberto(h) ? h : R.somarDias(h, 1); }

  function dataLonga(data) {
    const [a, m, d] = data.split('-').map(Number);
    return { dia: DIAS[R.diaDaSemana(data)], resto: `${d} de ${MESES[m - 1]}${a !== new Date().getFullYear() ? ' de ' + a : ''}` };
  }
  function dataCurta(data) { return data.split('-').reverse().slice(0, 2).join('/'); }
  function duracaoTexto(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
  }
  function quando(iso) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function lerValor(t) {
    const limpo = String(t || '').replace(/[^\d,.-]/g, '');
    if (!limpo) return NaN;
    const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
    return Math.round(parseFloat(normal) * 100) / 100;
  }

  function usuario() { return est.usuarioId ? agenda.usuario(est.usuarioId) : null; }
  function prof(id) { return agenda.profissionais().find((p) => p.id === id); }
  function sala(id) { return agenda.salas().find((s) => s.id === id); }

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(mostrarAviso.t);
    mostrarAviso.t = setTimeout(() => { aviso.hidden = true; }, 2600);
  }

  /* ---------- entrada ---------- */

  function renderEntrada() {
    const us = agenda.usuarios();
    app.innerHTML = `
      <section class="entrada">
        <h1>Quem está usando a agenda?</h1>
        <p class="mudo">Protótipo sem senha. No sistema real, cada pessoa entra com o próprio login.</p>
        <div class="lista-usuarios">
          ${us.map((u) => {
            const p = u.profissionalId ? prof(u.profissionalId) : null;
            return `<button data-acao="entrar" data-id="${u.id}">
              <span class="bolinha" style="--cor:${p ? p.cor : 'var(--acento)'}"></span>
              <strong>${esc(u.nome)}</strong>
              <small>${u.papel === 'RECEPCAO' ? 'vê e altera tudo' : 'dentista'}</small>
            </button>`;
          }).join('')}
        </div>
      </section>`;
  }

  /* ---------- folha do dia ---------- */

  function renderAgenda() {
    const u = usuario();
    if (!u) return renderEntrada();
    const salas = agenda.salas();
    const { dia, resto } = dataLonga(est.data);
    const ehHoje = est.data === hojeStr();
    const aberto = R.diaAberto(est.data);
    const feriado = R.feriado(est.data);
    const bloqueios = agenda.bloqueiosDoDia(est.data);
    const meuProf = u.profissionalId ? prof(u.profissionalId) : null;
    const preferencias = (s) => agenda.profissionais()
      .filter((p) => p.tipo === 'FIXO' && p.salaPreferencialId === s.id).map((p) => p.curto).join(' · ') || 'Rotativa';

    app.innerHTML = `
      <header class="topo">
        <div class="topo-linha">
          <div class="marca">Agenda <span>da clínica</span></div>
          <button class="botao-usuario" data-acao="menu" aria-label="Menu do usuário">
            <span class="bolinha" style="--cor:${meuProf ? meuProf.cor : 'var(--acento)'}"></span>
            <span>${esc(u.nome)}</span>
          </button>
        </div>
        <nav class="dias" aria-label="Escolher dia">
          <button data-acao="dia" data-n="-1" aria-label="Dia anterior">‹</button>
          <label class="dia-atual">
            <strong>${dia}${ehHoje ? ' · hoje' : ''}</strong>
            <small>${resto}</small>
            <input type="date" id="escolher-dia" value="${est.data}" aria-label="Escolher data">
          </label>
          <button data-acao="dia" data-n="1" aria-label="Próximo dia">›</button>
          <button class="hoje" data-acao="hoje"${ehHoje ? ' disabled' : ''}>Hoje</button>
        </nav>
        <div class="ferramentas">
          ${meuProf ? `<div class="alternador" role="group" aria-label="Filtro">
            <button data-acao="filtro" data-v="0" aria-pressed="${!est.soMinha}">Todos</button>
            <button data-acao="filtro" data-v="1" aria-pressed="${est.soMinha}">Minha agenda</button>
          </div>` : ''}
          <button class="pilula" data-acao="bloquear">Bloquear período</button>
          ${R.podeGerenciarEquipe(u) ? '<button class="pilula" data-acao="equipe">Equipe</button>' : ''}
        </div>
        ${aberto ? `<div class="cab-salas" aria-hidden="true">
          <div></div>
          ${salas.map((s) => `<div>${esc(s.nome)}<small>${esc(preferencias(s))}</small></div>`).join('')}
        </div>` : ''}
      </header>
      <main>
        ${(feriado || bloqueios.length) ? `<div class="faixas">
          ${feriado ? `<div class="faixa feriado"><strong>Feriado:</strong> ${esc(feriado)}. A agenda continua aberta.</div>` : ''}
          ${bloqueios.map((b) => {
            const p = prof(b.profissionalId);
            return `<button class="faixa ausencia" data-acao="ver-bloqueio" data-id="${b.id}">
              <span class="bolinha" style="--cor:${p.cor}"></span>
              <span><strong>${esc(p.nome)}</strong> ausente ${R.hhmm(b.inicio)}–${R.hhmm(b.fim)} · ${esc(b.motivo)}</span>
            </button>`;
          }).join('')}
        </div>` : ''}
        ${aberto ? grade(u, salas, ehHoje) : '<p class="fechado">Domingo: a clínica não abre.</p>'}
      </main>
      ${aberto ? '<button class="fab" data-acao="nova">+ Marcar</button>' : ''}`;

    if (ehHoje && aberto && !est.rolouParaAgora) {
      est.rolouParaAgora = true;
      const linha = app.querySelector('.agora');
      if (linha) requestAnimationFrame(() => linha.scrollIntoView({ block: 'center' }));
    }
  }

  function grade(u, salas, ehHoje) {
    const consultas = agenda.consultasDoDia(est.data);
    const horas = R.horarios();
    const agora = { data: hojeStr(), min: agoraMin() };
    let html = horas.map((m, i) => `<div class="hora${m % 60 ? '' : ' cheia'}" style="grid-row:${i + 1}">${m % 60 ? '' : R.hhmm(m)}</div>`).join('');

    salas.forEach((s, c) => {
      const ocupado = new Array(horas.length).fill(false);
      for (const con of consultas.filter((x) => x.salaId === s.id)) {
        const linha = (con.inicio - R.ABRE) / R.PASSO;
        const span = (con.fim - con.inicio) / R.PASSO;
        for (let i = linha; i < linha + span; i++) ocupado[i] = true;
        const p = prof(con.profissionalId);
        const st = R.statusExibido(con, agora);
        const apagado = est.soMinha && u.profissionalId && con.profissionalId !== u.profissionalId;
        html += `<button class="cartao st-${st}${span === 1 ? ' curto' : ''}${apagado ? ' apagado' : ''}"
            style="grid-row:${linha + 1} / span ${span};grid-column:${c + 2};--cor:${p.cor}"
            data-acao="ver" data-id="${con.id}"
            aria-label="${esc(`${con.paciente}, ${p.nome}, ${R.hhmm(con.inicio)} às ${R.hhmm(con.fim)}, ${s.nome}, ${NOME_STATUS[st]}`)}">
          <span class="c-pac">${esc(con.paciente)}</span>
          <span class="c-prof">${esc(p.curto)}</span>
          <span class="c-st"><span class="ponto"></span><span class="rotulo">${STATUS_CURTO[st]}</span></span>
        </button>`;
      }
      horas.forEach((m, i) => {
        if (!ocupado[i]) {
          html += `<button class="vazio" style="grid-row:${i + 1};grid-column:${c + 2}" data-acao="nova" data-sala="${s.id}" data-min="${m}" aria-label="Marcar na ${esc(s.nome)} às ${R.hhmm(m)}">+</button>`;
        }
      });
    });

    if (ehHoje) {
      const min = agoraMin();
      if (min >= R.ABRE && min <= R.FECHA) html += `<div class="agora" style="--pos:${((min - R.ABRE) / R.PASSO).toFixed(3)}" aria-hidden="true"></div>`;
    }
    return `<div class="grade" style="grid-template-rows:repeat(${horas.length}, var(--linha))">${html}</div>`;
  }

  /* ---------- painel ---------- */

  function abrirPainel(titulo, html, atual) {
    painelTitulo.textContent = titulo;
    painelCorpo.innerHTML = html;
    painel.hidden = false;
    est.painelAtual = atual || null;
    document.body.style.overflow = 'hidden';
    const foco = painelCorpo.querySelector('[autofocus]');
    if (foco && window.matchMedia('(min-width: 720px)').matches) foco.focus();
  }

  function fecharPainel() {
    painel.hidden = true;
    painelCorpo.innerHTML = '';
    est.painelAtual = null;
    document.body.style.overflow = '';
  }

  /* ---------- marcar / editar ---------- */

  function opcoesHorario(selecionado, de, ate) {
    let h = '';
    for (let m = de; m <= ate; m += R.PASSO) h += `<option value="${m}"${m === selecionado ? ' selected' : ''}>${R.hhmm(m)}</option>`;
    return h;
  }

  function abrirFormConsulta({ id, salaId, inicio }) {
    const u = usuario();
    const atual = id ? agenda.consulta(id) : null;
    const profs = agenda.profissionais().filter((p) => (atual && p.id === atual.profissionalId) || R.podeMarcarPara(u, p));

    let profId = atual ? atual.profissionalId : null;
    if (!profId && u.profissionalId) profId = u.profissionalId;
    if (!profId && salaId) {
      const daSala = profs.find((p) => p.salaPreferencialId === salaId);
      profId = daSala ? daSala.id : null;
    }

    const c = atual || {
      paciente: '', profissionalId: profId, salaId: salaId || (profId && prof(profId).salaPreferencialId) || 's1',
      data: est.data, inicio: inicio || R.ABRE, fim: (inicio || R.ABRE) + 60, procedimento: '',
    };
    const pg = atual ? agenda.pagamento(u, atual.id) : [];
    const duracoes = [];
    for (let d = 30; d <= 360; d += 30) duracoes.push(d);

    abrirPainel(atual ? 'Alterar consulta' : 'Marcar consulta', `
      <form id="form-consulta" novalidate>
        <div style="display:grid;gap:.9rem">
          <label class="campo"><span>Paciente</span>
            <input id="f-paciente" value="${esc(c.paciente)}" placeholder="Primeiro nome" autocomplete="off" autofocus required>
          </label>
          <label class="campo"><span>Profissional</span>
            <select id="f-prof" required>
              <option value="">Escolha…</option>
              ${profs.map((p) => `<option value="${p.id}"${p.id === c.profissionalId ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}
            </select>
          </label>
          <div class="tres">
            <label class="campo"><span>Dia</span><input type="date" id="f-data" value="${c.data}"></label>
            <label class="campo"><span>Início</span><select id="f-inicio">${opcoesHorario(c.inicio, R.ABRE, R.FECHA - R.PASSO)}</select></label>
            <label class="campo"><span>Duração</span><select id="f-duracao">
              ${duracoes.map((d) => `<option value="${d}"${d === c.fim - c.inicio ? ' selected' : ''}>${duracaoTexto(d)}</option>`).join('')}
            </select></label>
          </div>
          <fieldset class="campo" style="border:0;padding:0;margin:0">
            <legend class="rotulo-campo" style="margin-bottom:.3rem">Sala</legend>
            <div class="escolha-sala" id="f-salas">
              ${agenda.salas().map((s) => `<label data-sala="${s.id}">
                <input type="radio" name="f-sala" value="${s.id}"${s.id === c.salaId ? ' checked' : ''}>
                <strong>${esc(s.nome)}</strong><small>…</small>
              </label>`).join('')}
            </div>
          </fieldset>
          <div id="f-situacao" class="situacao" hidden></div>
          <label class="campo"><span>Procedimento / observação</span>
            <textarea id="f-proc" placeholder="Ex.: Restauração 26">${esc(c.procedimento)}</textarea>
          </label>
          <div id="f-pg-area"></div>
          <div id="f-erro" class="situacao erro" hidden></div>
          <div class="acoes">
            <button class="btn primario" type="submit">${atual ? 'Salvar alteração' : 'Marcar'}</button>
            <button class="btn" type="button" data-acao="fechar">Cancelar</button>
          </div>
        </div>
      </form>`, { tipo: 'form' });

    const form = document.getElementById('form-consulta');
    const f = (sel) => form.querySelector(sel);
    let salaManual = !!atual || !!salaId;
    let partesPg = (pg || []).map((p) => ({ ...p }));

    function rascunho() {
      const inicioSel = Number(f('#f-inicio').value);
      return {
        id: atual ? atual.id : '__novo__',
        paciente: f('#f-paciente').value,
        profissionalId: f('#f-prof').value,
        salaId: (form.querySelector('input[name="f-sala"]:checked') || {}).value,
        data: f('#f-data').value,
        inicio: inicioSel,
        fim: inicioSel + Number(f('#f-duracao').value),
        procedimento: f('#f-proc').value,
      };
    }

    function marcarSala(id) {
      const r = form.querySelector(`input[name="f-sala"][value="${id}"]`);
      if (r) r.checked = true;
    }

    function atualizarSituacao(origem) {
      const r = rascunho();
      const consultas = agenda.consultasDoDia(r.data);
      const p = prof(r.profissionalId);
      const box = f('#f-situacao');

      // ocupação de cada sala no horário escolhido
      agenda.salas().forEach((s) => {
        const lab = form.querySelector(`label[data-sala="${s.id}"]`);
        const livre = R.salaLivre(s.id, r, consultas);
        lab.classList.toggle('livre', livre);
        lab.classList.toggle('ocupada', !livre);
        let txt = 'livre';
        if (!livre) {
          const o = consultas.find((x) => x.id !== r.id && x.salaId === s.id && R.sobrepoe(x, r));
          txt = o ? `ocupada · ${prof(o.profissionalId).curto}` : 'ocupada';
        }
        lab.querySelector('small').textContent = txt;
      });

      // troca automática de sala enquanto a pessoa não escolheu uma
      let trocou = null;
      if (p && (origem === 'prof' || origem === 'hora' || origem === 'inicio') && R.diaAberto(r.data)) {
        const atualLivre = r.salaId && R.salaLivre(r.salaId, r, consultas);
        const pref = p.salaPreferencialId;
        if ((!salaManual && R.salaLivre(pref, r, consultas) && r.salaId !== pref) || !atualLivre) {
          const sug = R.sugerirSala(p, r, agenda.salas(), consultas);
          if (sug && sug !== r.salaId) {
            if (r.salaId && !atualLivre) trocou = `${sala(r.salaId).nome} está ocupada nesse horário. Mudamos para a ${sala(sug).nome}.`;
            marcarSala(sug);
          }
        }
      }

      const r2 = rascunho();
      if (!r2.profissionalId || !r2.salaId) { box.hidden = true; atualizarPagamento(); return; }
      const v = agenda.verificar(r2);
      box.hidden = false;
      if (v.erro) {
        box.className = 'situacao erro';
        box.innerHTML = esc(v.erro);
      } else if (v.conflitos.length) {
        const sug = v.brutos.every((x) => x.tipo === 'sala') ? R.sugerirSala(prof(r2.profissionalId), r2, agenda.salas(), consultas) : null;
        box.className = 'situacao erro';
        box.innerHTML = `<strong>Horário indisponível</strong><ul>${v.conflitos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          ${sug ? `<button type="button" class="btn" data-usar-sala="${sug}">Usar a ${esc(sala(sug).nome)}, que está livre</button>` : '<span>Escolha outro horário ou fale com quem marcou.</span>'}`;
      } else {
        box.className = trocou ? 'situacao info' : 'situacao ok';
        box.textContent = trocou || `${sala(r2.salaId).nome} livre das ${R.hhmm(r2.inicio)} às ${R.hhmm(r2.fim)}.`;
      }
      atualizarPagamento();
    }

    function atualizarPagamento() {
      const area = f('#f-pg-area');
      const pId = f('#f-prof').value;
      if (!pId) { area.innerHTML = ''; return; }
      const podeVer = R.podeVerPagamento(u, { profissionalId: pId, criadoPor: atual ? atual.criadoPor : u.id });
      if (!podeVer) {
        area.innerHTML = `<p class="nota">O pagamento fica visível só para a recepção e para ${esc(prof(pId).nome)}.</p>`;
        return;
      }
      if (area.dataset.montado === pId) return; // não redesenha enquanto digita
      area.dataset.montado = pId;
      desenharPagamento();
    }

    function desenharPagamento() {
      const area = f('#f-pg-area');
      const total = R.totalPagamento(partesPg.filter((p) => p.valor > 0));
      area.innerHTML = `<div class="pagamento">
        <span class="rotulo-campo">Pagamento <span class="mudo" style="text-transform:none;letter-spacing:0;font-weight:400">· só recepção e profissional veem</span></span>
        ${partesPg.map((p, i) => `<div class="parte" data-i="${i}">
          <select data-campo="forma" aria-label="Forma">${R.FORMAS.map((fm) => `<option value="${fm}"${fm === p.forma ? ' selected' : ''}>${NOME_FORMA[fm]}</option>`).join('')}</select>
          <input data-campo="valor" inputmode="decimal" placeholder="R$ 0,00" value="${p.valor ? String(p.valor).replace('.', ',') : ''}" aria-label="Valor">
          ${p.forma === 'CREDITO'
            ? `<select data-campo="parcelas" aria-label="Parcelas">${Array.from({ length: 24 }, (_, k) => k + 1).map((n) => `<option value="${n}"${n === (p.parcelas || 1) ? ' selected' : ''}>${n}x</option>`).join('')}</select>`
            : '<span></span>'}
          <button type="button" class="remover" data-remover="${i}" aria-label="Remover parte">✕</button>
        </div>`).join('')}
        <button type="button" class="btn link" data-adicionar-parte>+ ${partesPg.length ? 'Outra forma (ex.: entrada + cartão)' : 'Adicionar pagamento'}</button>
        ${partesPg.length ? `<div class="total"><span>Total</span><span id="f-total">${brl.format(total)}</span></div>` : ''}
      </div>`;
    }

    form.addEventListener('input', (e) => {
      const parte = e.target.closest('.parte');
      if (parte) {
        const i = Number(parte.dataset.i);
        const campo = e.target.dataset.campo;
        if (campo === 'valor') partesPg[i].valor = lerValor(e.target.value);
        const t = form.querySelector('#f-total');
        if (t) t.textContent = brl.format(R.totalPagamento(partesPg.filter((p) => p.valor > 0)));
        return;
      }
      if (e.target.name === 'f-sala') salaManual = true;
    });

    form.addEventListener('change', (e) => {
      const parte = e.target.closest('.parte');
      if (parte) {
        const i = Number(parte.dataset.i);
        const campo = e.target.dataset.campo;
        if (campo === 'forma') { partesPg[i].forma = e.target.value; if (e.target.value !== 'CREDITO') partesPg[i].parcelas = 1; desenharPagamento(); }
        if (campo === 'parcelas') partesPg[i].parcelas = Number(e.target.value);
        return;
      }
      if (e.target.id === 'f-prof') { f('#f-pg-area').dataset.montado = ''; atualizarSituacao('prof'); }
      else if (e.target.id === 'f-inicio' || e.target.id === 'f-duracao' || e.target.id === 'f-data') atualizarSituacao('hora');
      else if (e.target.name === 'f-sala') { salaManual = true; atualizarSituacao('sala'); }
    });

    form.addEventListener('click', (e) => {
      const usar = e.target.closest('[data-usar-sala]');
      if (usar) { marcarSala(usar.dataset.usarSala); salaManual = true; atualizarSituacao('sala'); return; }
      if (e.target.closest('[data-adicionar-parte]')) {
        partesPg.push({ forma: partesPg.length ? 'CREDITO' : 'PIX', valor: NaN, parcelas: 1 });
        desenharPagamento();
        const inputs = form.querySelectorAll('.parte input[data-campo="valor"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
        return;
      }
      const rem = e.target.closest('[data-remover]');
      if (rem) { partesPg.splice(Number(rem.dataset.remover), 1); desenharPagamento(); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = rascunho();
      const erro = f('#f-erro');
      erro.hidden = true;
      const dados = { ...r, id: atual ? atual.id : undefined, versao: atual ? atual.versao : undefined };
      const podeVer = r.profissionalId && R.podeVerPagamento(u, { profissionalId: r.profissionalId });
      if (podeVer) {
        dados.pagamento = partesPg.filter((p) => p.valor > 0); // linhas sem valor são ignoradas
      }
      try {
        const salva = agenda.salvarConsulta(u, dados);
        fecharPainel();
        est.data = salva.data;
        renderAgenda();
        mostrarAviso(atual ? 'Consulta alterada.' : `Consulta de ${salva.paciente} marcada às ${R.hhmm(salva.inicio)} na ${sala(salva.salaId).nome}.`);
      } catch (err) {
        erro.hidden = false;
        const lista = err.detalhes && err.detalhes.conflitos;
        erro.innerHTML = `<strong>${esc(err.message)}</strong>${lista ? `<ul>${lista.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}`;
        erro.scrollIntoView({ block: 'nearest' });
        atualizarSituacao('erro');
      }
    });

    atualizarSituacao(atual ? 'abrir' : 'prof');
  }

  /* ---------- detalhe ---------- */

  function abrirDetalhe(id, confirmando) {
    const u = usuario();
    const c = agenda.consulta(id);
    if (!c || c.status === 'DESMARCADO') { fecharPainel(); mostrarAviso('Essa consulta foi desmarcada.'); return; }
    const p = prof(c.profissionalId);
    const st = R.statusExibido(c, { data: hojeStr(), min: agoraMin() });
    const pode = R.podeEditar(u, c);
    const pg = agenda.pagamento(u, c.id);
    const hist = agenda.historico(c.id);
    const criador = agenda.nomeUsuario(c.criadoPor);

    abrirPainel(c.paciente, `
      <div class="ficha">
        <div class="linha"><span>Profissional</span><span><span class="etiqueta"><span class="bolinha" style="--cor:${p.cor}"></span>${esc(p.nome)}</span></span></div>
        <div class="linha"><span>Quando</span><span>${dataLonga(c.data).dia}, ${dataCurta(c.data)} · ${R.hhmm(c.inicio)}–${R.hhmm(c.fim)}</span></div>
        <div class="linha"><span>Sala</span><span>${esc(sala(c.salaId).nome)}</span></div>
        <div class="linha"><span>Procedimento</span><span>${c.procedimento ? esc(c.procedimento) : '<span class="mudo">Não informado</span>'}</span></div>
        <div class="linha"><span>Status</span><span class="etiqueta" style="color:${st === 'ATRASADO' ? 'var(--perigo)' : 'inherit'}">${NOME_STATUS[st]}</span></div>
        <div class="linha"><span>Marcado por</span><span>${esc(criador)} · ${quando(c.criadoEm)}</span></div>
      </div>

      ${pg ? `<div class="pagamento">
        <span class="rotulo-campo">Pagamento</span>
        ${pg.length ? pg.map((x) => `<div class="total" style="font-weight:400"><span>${NOME_FORMA[x.forma]}${x.forma === 'CREDITO' ? ` em ${x.parcelas}x` : ''}</span><span>${brl.format(x.valor)}</span></div>`).join('')
          + `<div class="total"><span>Total</span><span>${brl.format(R.totalPagamento(pg))}</span></div>`
          : '<span class="mudo">Nada registrado.</span>'}
      </div>` : ''}

      ${pode ? `
        <div style="display:grid;gap:.4rem">
          <span class="rotulo-campo">Atualizar status</span>
          <div class="status-botoes">
            ${['CHEGOU', 'EM_ATENDIMENTO', 'FINALIZADO', 'FALTOU'].map((s) => `<button data-acao="status" data-id="${c.id}" data-status="${s}" aria-pressed="${c.status === s}">${NOME_STATUS[s]}</button>`).join('')}
          </div>
          ${c.status !== 'AGENDADO' ? `<button class="btn link" style="justify-self:start" data-acao="status" data-id="${c.id}" data-status="AGENDADO">Voltar para agendado</button>` : ''}
        </div>
        ${confirmando ? `<div class="confirmar">
          <strong>Desmarcar ${esc(c.paciente)} às ${R.hhmm(c.inicio)}?</strong>
          <span class="nota" style="color:inherit">O horário fica livre para outra pessoa.</span>
          <div class="acoes">
            <button class="btn perigo cheio" data-acao="desmarcar-sim" data-id="${c.id}">Sim, desmarcar</button>
            <button class="btn" data-acao="ver" data-id="${c.id}">Voltar</button>
          </div>
        </div>` : `<div class="acoes">
          <button class="btn primario" data-acao="editar" data-id="${c.id}">Alterar / remarcar</button>
          <button class="btn perigo" data-acao="desmarcar" data-id="${c.id}">Desmarcar</button>
        </div>`}`
      : `<p class="nota">Só a recepção${agenda.usuario(c.criadoPor) && agenda.usuario(c.criadoPor).profissionalId === c.profissionalId
          ? ` ou ${esc(p.nome)} podem`
          : c.criadoPor === 'u-recepcao' ? ` ou ${esc(p.nome)} podem` : `, ${esc(p.nome)} ou ${esc(criador)} (quem marcou) podem`} alterar esta consulta.</p>`}

      <details>
        <summary>Histórico (${hist.length})</summary>
        <ol class="historico">${hist.map((h) => `<li><strong>${esc(h.usuario)}</strong>: ${esc(h.acao)} <span class="mudo">· ${quando(h.quando)}</span></li>`).join('')}</ol>
      </details>`, { tipo: 'consulta', id });
  }

  /* ---------- bloqueio ---------- */

  function abrirFormBloqueio() {
    const u = usuario();
    const profs = agenda.profissionais().filter((p) => p.ativo && R.podeBloquear(u, p.id));
    abrirPainel('Bloquear período', `
      <form id="form-bloqueio" novalidate style="display:grid;gap:.9rem">
        <p class="nota">Ninguém consegue marcar paciente para o profissional nesse período.</p>
        <label class="campo"><span>Profissional</span>
          <select id="b-prof"${profs.length === 1 ? ' disabled' : ''}>
            ${profs.map((p) => `<option value="${p.id}"${p.id === u.profissionalId ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}
          </select>
        </label>
        <label class="campo"><span>Dia</span><input type="date" id="b-data" value="${est.data}"></label>
        <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" id="b-inteiro"> Dia inteiro</label>
        <div class="duas" id="b-horas">
          <label class="campo"><span>De</span><select id="b-inicio">${opcoesHorario(14 * 60, R.ABRE, R.FECHA - R.PASSO)}</select></label>
          <label class="campo"><span>Até</span><select id="b-fim">${opcoesHorario(18 * 60, R.ABRE + R.PASSO, R.FECHA)}</select></label>
        </div>
        <label class="campo"><span>Motivo</span>
          <input id="b-motivo" list="b-motivos" placeholder="Curso, folga…">
          <datalist id="b-motivos"><option value="Curso"><option value="Folga"><option value="Consulta médica"><option value="Ausência"></datalist>
        </label>
        <div id="b-erro" class="situacao erro" hidden></div>
        <div class="acoes">
          <button class="btn primario" type="submit">Bloquear</button>
          <button class="btn" type="button" data-acao="fechar">Cancelar</button>
        </div>
      </form>`, { tipo: 'form' });

    const form = document.getElementById('form-bloqueio');
    form.querySelector('#b-inteiro').addEventListener('change', (e) => { form.querySelector('#b-horas').hidden = e.target.checked; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inteiro = form.querySelector('#b-inteiro').checked;
      const dados = {
        profissionalId: form.querySelector('#b-prof').value,
        data: form.querySelector('#b-data').value,
        inicio: inteiro ? R.ABRE : Number(form.querySelector('#b-inicio').value),
        fim: inteiro ? R.FECHA : Number(form.querySelector('#b-fim').value),
        motivo: form.querySelector('#b-motivo').value,
      };
      try {
        agenda.criarBloqueio(u, dados);
        fecharPainel();
        est.data = dados.data;
        renderAgenda();
        mostrarAviso('Período bloqueado.');
      } catch (err) {
        const box = form.querySelector('#b-erro');
        box.hidden = false;
        const lista = err.detalhes && err.detalhes.conflitos;
        box.innerHTML = `<strong>${esc(err.message)}</strong>${lista ? `<ul>${lista.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}`;
      }
    });
  }

  function abrirBloqueio(id) {
    const u = usuario();
    const b = agenda.bloqueiosDoDia(est.data).find((x) => x.id === id);
    if (!b) { fecharPainel(); return; }
    const p = prof(b.profissionalId);
    abrirPainel(`${p.nome} ausente`, `
      <div class="ficha">
        <div class="linha"><span>Quando</span><span>${dataCurta(b.data)} · ${R.hhmm(b.inicio)}–${R.hhmm(b.fim)}</span></div>
        <div class="linha"><span>Motivo</span><span>${esc(b.motivo)}</span></div>
        <div class="linha"><span>Bloqueado por</span><span>${esc(agenda.nomeUsuario(b.criadoPor))}</span></div>
      </div>
      ${R.podeRemoverBloqueio(u, b)
        ? `<div class="acoes"><button class="btn perigo" data-acao="remover-bloqueio" data-id="${b.id}">Remover bloqueio</button></div>`
        : '<p class="nota">Só a recepção ou o próprio profissional removem este bloqueio.</p>'}`, { tipo: 'bloqueio', id });
  }

  /* ---------- menu e equipe ---------- */

  function abrirMenu(confirmando) {
    const u = usuario();
    abrirPainel(u.nome, `
      <div class="acoes" style="flex-direction:column;align-items:stretch">
        <button class="btn" data-acao="sair">Trocar usuário</button>
      </div>
      <div class="pagamento">
        <span class="rotulo-campo">Sobre este protótipo</span>
        <p class="nota">Os dados ficam só neste navegador. Para ver dois aparelhos ao mesmo tempo, abra a página em duas abas, entre como pessoas diferentes e marque nas duas: uma aba vê a mudança da outra na hora.</p>
        ${confirmando
          ? `<div class="confirmar"><strong>Apagar tudo e voltar aos dados de exemplo?</strong>
              <div class="acoes"><button class="btn perigo cheio" data-acao="restaurar-sim">Sim, restaurar</button><button class="btn" data-acao="menu">Voltar</button></div></div>`
          : '<button class="btn link" style="justify-self:start" data-acao="restaurar">Restaurar dados de exemplo</button>'}
      </div>`, { tipo: 'menu' });
  }

  function abrirEquipe() {
    const u = usuario();
    const profs = agenda.profissionais();
    const linha = (p) => `<li>
      <span class="bolinha" style="--cor:${p.cor}"></span>
      <span><strong>${esc(p.nome)}</strong><br><small class="mudo">${p.tipo === 'FIXO' ? 'Fixo · login próprio' : 'Avulso · sem login'} · prefere ${esc(sala(p.salaPreferencialId).nome)}${p.ativo ? '' : ' · inativo'}</small></span>
      ${p.tipo === 'AVULSO' ? `<button class="btn link acao" data-acao="alternar" data-id="${p.id}">${p.ativo ? 'Desativar' : 'Ativar'}</button>` : ''}
    </li>`;
    abrirPainel('Equipe', `
      <div class="equipe">
        <span class="rotulo-campo">Fixos</span>
        <ul>${profs.filter((p) => p.tipo === 'FIXO').map(linha).join('')}</ul>
        <span class="rotulo-campo" style="margin-top:.5rem">Avulsos</span>
        <ul>${profs.filter((p) => p.tipo === 'AVULSO').map(linha).join('')}</ul>
      </div>
      <form id="form-avulso" style="display:grid;gap:.6rem" novalidate>
        <label class="campo"><span>Novo avulso</span><input id="a-nome" placeholder="Ex.: Dr. Paulo" autocomplete="off"></label>
        <div id="a-erro" class="situacao erro" hidden></div>
        <div class="acoes"><button class="btn primario" type="submit">Adicionar</button></div>
      </form>`, { tipo: 'equipe' });
    document.getElementById('form-avulso').addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const p = agenda.adicionarAvulso(u, document.getElementById('a-nome').value);
        abrirEquipe();
        mostrarAviso(`${p.nome} adicionado.`);
      } catch (err) {
        const box = document.getElementById('a-erro');
        box.hidden = false;
        box.textContent = err.message;
      }
    });
  }

  /* ---------- eventos ---------- */

  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo) return;
    const acao = alvo.dataset.acao;
    const u = usuario();
    try {
      switch (acao) {
        case 'entrar':
          est.usuarioId = alvo.dataset.id; salvarPref('usuario', est.usuarioId);
          est.rolouParaAgora = false; renderAgenda(); break;
        case 'sair':
          est.usuarioId = null; salvarPref('usuario', ''); fecharPainel(); renderEntrada(); break;
        case 'dia': est.data = R.somarDias(est.data, Number(alvo.dataset.n)); renderAgenda(); break;
        case 'hoje': est.data = hojeStr(); est.rolouParaAgora = false; renderAgenda(); break;
        case 'filtro': est.soMinha = alvo.dataset.v === '1'; salvarPref('soMinha', est.soMinha ? '1' : '0'); renderAgenda(); break;
        case 'nova':
          abrirFormConsulta({ salaId: alvo.dataset.sala, inicio: alvo.dataset.min ? Number(alvo.dataset.min) : null }); break;
        case 'ver': abrirDetalhe(alvo.dataset.id); break;
        case 'editar': abrirFormConsulta({ id: alvo.dataset.id }); break;
        case 'desmarcar': abrirDetalhe(alvo.dataset.id, true); break;
        case 'desmarcar-sim': {
          const c = agenda.desmarcar(u, alvo.dataset.id);
          fecharPainel(); renderAgenda(); mostrarAviso(`Consulta de ${c.paciente} desmarcada. Horário livre.`); break;
        }
        case 'status':
          agenda.mudarStatus(u, alvo.dataset.id, alvo.dataset.status);
          renderAgenda(); abrirDetalhe(alvo.dataset.id); break;
        case 'bloquear': abrirFormBloqueio(); break;
        case 'ver-bloqueio': abrirBloqueio(alvo.dataset.id); break;
        case 'remover-bloqueio':
          agenda.removerBloqueio(u, alvo.dataset.id); fecharPainel(); renderAgenda(); mostrarAviso('Bloqueio removido.'); break;
        case 'menu': abrirMenu(); break;
        case 'restaurar': abrirMenu(true); break;
        case 'restaurar-sim':
          agenda.restaurarExemplo(); est.data = diaInicial(); est.rolouParaAgora = false;
          fecharPainel(); renderAgenda(); mostrarAviso('Dados de exemplo restaurados.'); break;
        case 'equipe': abrirEquipe(); break;
        case 'alternar': agenda.alternarAtivo(u, alvo.dataset.id); abrirEquipe(); break;
        case 'fechar': fecharPainel(); break;
        default: break;
      }
    } catch (err) {
      mostrarAviso(err.message);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'escolher-dia' && e.target.value) { est.data = e.target.value; renderAgenda(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !painel.hidden) fecharPainel();
  });

  // Outra aba (outro "aparelho") mudou a agenda: atualiza na hora.
  window.addEventListener('storage', (e) => {
    if (e.key !== window.Dados.CHAVE || !usuario()) return;
    renderAgenda();
    const atual = est.painelAtual;
    if (atual && atual.tipo === 'consulta') abrirDetalhe(atual.id);
    if (atual && atual.tipo === 'bloqueio') abrirBloqueio(atual.id);
    mostrarAviso('Agenda atualizada por outro aparelho.');
  });

  // Atualiza linha do "agora" e status de atraso a cada minuto.
  setInterval(() => { if (usuario()) renderAgenda(); }, 60000);

  if (est.usuarioId && !agenda.usuario(est.usuarioId)) est.usuarioId = null;
  renderAgenda();
})();
