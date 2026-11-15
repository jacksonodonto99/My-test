// Testes das regras e da camada de dados. Rodar: node --test prototipo/testes/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../regras.js');
const { criarAgenda, ErroAgenda } = require('../dados.js');

function memoria() {
  const m = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } };
}

// Segunda-feira, 16/11/2026, 07:00 (antes de abrir: tudo AGENDADO)
const agenda = () => {
  const a = criarAgenda({ storage: memoria(), agora: () => new Date(2026, 10, 16, 7, 0) });
  a.iniciar();
  return a;
};
const DIA = '2026-11-16';
const recepcao = { id: 'u-recepcao', papel: 'RECEPCAO', profissionalId: null };
const jackson = { id: 'u-jackson', papel: 'DENTISTA', profissionalId: 'p-jackson' };
const laura = { id: 'u-laura', papel: 'DENTISTA', profissionalId: 'p-laura' };
const laiane = { id: 'u-laiane', papel: 'DENTISTA', profissionalId: 'p-laiane' };

test('horário de funcionamento', () => {
  assert.equal(R.validarHorario({ data: DIA, inicio: 480, fim: 510 }), null);
  assert.equal(R.validarHorario({ data: '2026-11-21', inicio: 1140, fim: 1200 }), null); // sábado até 20h
  assert.match(R.validarHorario({ data: '2026-11-15', inicio: 480, fim: 510 }), /domingo/);
  assert.match(R.validarHorario({ data: DIA, inicio: 450, fim: 510 }), /Fora/);
  assert.match(R.validarHorario({ data: DIA, inicio: 1170, fim: 1230 }), /Fora/);
  assert.match(R.validarHorario({ data: DIA, inicio: 495, fim: 540 }), /30 em 30/);
});

test('feriados nacionais, incluindo os móveis', () => {
  assert.equal(R.pascoa(2026), '2026-04-05');
  assert.equal(R.feriado('2026-04-03'), 'Sexta-feira Santa');
  assert.equal(R.feriado('2026-11-20'), 'Dia da Consciência Negra');
  assert.equal(R.feriado('2026-11-16'), null);
});

test('permissões de alteração', () => {
  const daLauraPelaLaura = { criadoPor: 'u-laura', profissionalId: 'p-laura' };
  const doJacksonPelaRecepcao = { criadoPor: 'u-recepcao', profissionalId: 'p-jackson' };
  assert.ok(R.podeEditar(laura, daLauraPelaLaura));
  assert.ok(R.podeEditar(recepcao, daLauraPelaLaura));
  assert.ok(!R.podeEditar(jackson, daLauraPelaLaura));
  assert.ok(R.podeEditar(jackson, doJacksonPelaRecepcao));
});

test('pagamento: só recepção e quem atende', () => {
  const c = { criadoPor: 'u-jackson', profissionalId: 'p-laura' }; // Jackson marcou para Laura
  assert.ok(R.podeVerPagamento(recepcao, c));
  assert.ok(R.podeVerPagamento(laura, c));
  assert.ok(!R.podeVerPagamento(jackson, c));
});

test('pagamento combinado: Pix de entrada + 10x no crédito', () => {
  const pg = [{ forma: 'PIX', valor: 500 }, { forma: 'CREDITO', valor: 2000, parcelas: 10 }];
  assert.equal(R.validarPagamento(pg), null);
  assert.equal(R.totalPagamento(pg), 2500);
  assert.match(R.validarPagamento([{ forma: 'PIX', valor: 100, parcelas: 3 }]), /crédito/);
});

test('sala ocupada sugere outra sala livre', () => {
  const a = agenda();
  // 14:30 Jackson ocupa a Sala 3; Laura já está na Sala 2. Gleuberson na Sala 1.
  const laurap = a.profissionais().find((p) => p.id === 'p-laura');
  const alvo = { id: 'novo', data: DIA, inicio: 18 * 60, fim: 19 * 60 }; // 18h: Jackson na Sala 3
  assert.equal(R.sugerirSala(laurap, alvo, a.salas(), a.consultasDoDia(DIA)), 's1');
});

test('não deixa marcar sala ocupada e diz quem marcou', () => {
  const a = agenda();
  assert.throws(
    () => a.salvarConsulta(recepcao, { paciente: 'Teste', profissionalId: 'p-laura', salaId: 's3', data: DIA, inicio: 14 * 60, fim: 14 * 60 + 30 }),
    (e) => e instanceof ErroAgenda && e.detalhes.conflitos.some((m) => /Sala 3.*Marcado por Recepção/.test(m)) && e.detalhes.salaSugerida === 's2',
  );
});

test('não deixa marcar profissional em duas salas nem durante bloqueio', () => {
  const a = agenda();
  assert.throws(() => a.salvarConsulta(recepcao, { paciente: 'X', profissionalId: 'p-jackson', salaId: 's2', data: DIA, inicio: 14 * 60, fim: 15 * 60 }), /indisponível/);
  assert.throws(() => a.salvarConsulta(recepcao, { paciente: 'X', profissionalId: 'p-laiane', salaId: 's2', data: DIA, inicio: 15 * 60, fim: 16 * 60 }), /indisponível/);
});

test('dentista não marca avulso; recepção marca', () => {
  const a = agenda();
  const d = { paciente: 'Y', profissionalId: 'p-marcos', salaId: 's2', data: DIA, inicio: 8 * 60, fim: 9 * 60 };
  assert.throws(() => a.salvarConsulta(jackson, d), /recepção/);
  assert.ok(a.salvarConsulta(recepcao, d).id);
});

test('Jackson marca para Laura; Laura e recepção veem o pagamento, Jackson pode alterar porque marcou', () => {
  const a = agenda();
  const c = a.salvarConsulta(jackson, { paciente: 'Z', profissionalId: 'p-laura', salaId: 's2', data: DIA, inicio: 12 * 60, fim: 13 * 60, pagamento: [{ forma: 'PIX', valor: 99 }] });
  assert.deepEqual(a.pagamento(jackson, c.id), null);
  assert.deepEqual(a.pagamento(laura, c.id), []); // Jackson não podia ver, então não gravou
  assert.ok(a.desmarcar(jackson, c.id));
});

test('Jackson não desmarca paciente da Laura marcado por ela', () => {
  const a = agenda();
  const daLaura = a.consultasDoDia(DIA).find((c) => c.paciente === 'Beatriz');
  assert.throws(() => a.desmarcar(jackson, daLaura.id), /não pode/);
  a.desmarcar(laura, daLaura.id);
  assert.ok(!a.consultasDoDia(DIA).some((c) => c.paciente === 'Beatriz'));
});

test('edição simultânea: a segunda gravação é recusada', () => {
  const a = agenda();
  const c = a.consultasDoDia(DIA).find((x) => x.paciente === 'Ana');
  const base = { ...c, versao: c.versao };
  a.salvarConsulta(recepcao, { ...base, procedimento: 'Coroa: cimentação' });
  assert.throws(() => a.salvarConsulta(jackson, { ...base, procedimento: 'Outra coisa' }), /alterou esta consulta/);
});

test('bloqueio: só o próprio dentista ou recepção, e não sobre paciente marcado', () => {
  const a = agenda();
  assert.throws(() => a.criarBloqueio(jackson, { profissionalId: 'p-laura', data: DIA, inicio: 480, fim: 540, motivo: 'Folga' }), /própria/);
  assert.throws(() => a.criarBloqueio(jackson, { profissionalId: 'p-jackson', data: DIA, inicio: 840, fim: 900, motivo: 'Curso' }), /pacientes/);
  assert.ok(a.criarBloqueio(laiane, { profissionalId: 'p-laiane', data: DIA, inicio: 480, fim: 540, motivo: 'Folga' }).id);
});

test('status atrasado é calculado', () => {
  const c = { data: DIA, inicio: 600, status: 'AGENDADO' };
  assert.equal(R.statusExibido(c, { data: DIA, min: 605 }), 'AGENDADO');
  assert.equal(R.statusExibido(c, { data: DIA, min: 615 }), 'ATRASADO');
  assert.equal(R.statusExibido({ ...c, status: 'CHEGOU' }, { data: DIA, min: 615 }), 'CHEGOU');
});
