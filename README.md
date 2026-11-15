# Agenda da Clínica

Agenda compartilhada de consultas odontológicas, pensada para o celular.
A folha do dia tem uma coluna por sala, e recepção e dentistas veem e marcam na mesma agenda.

- `docs/ESPECIFICACAO.md`: regras de negócio e modelo de dados.
- `prototipo/`: primeira versão funcional (dados salvos só no navegador).

## Rodar o protótipo

```bash
cd prototipo
python3 -m http.server 8000   # abra http://localhost:8000
node --test testes/*.test.js  # testes das regras
```

Arquivos:
- `regras.js`: regras puras (horário, conflitos, permissões, feriados, pagamento).
- `dados.js`: camada de dados; hoje usa o navegador, depois o Supabase.
- `app.js` / `app.css` / `index.html`: tela.
