# webapp_convocazioni

Web app minimale per convocazioni, ottimizzata per smartphone.

## Avvio locale

```bash
python3 -m http.server 8000
```

Apri `http://localhost:8000`.

## Flusso

1. Seleziona la società (`ALBACYNTHIA` o `ACADEMY CYNTHIA GENZANO`).
2. Seleziona il campionato disponibile per la società.
3. L'app compila automaticamente i dati della prossima gara.
4. Seleziona i convocati (max 20) dalla lista giocatori con pulsanti rapidi:
   - `Includi prestiti: SI/NO` (chiede conferma prima di caricare i prestiti consentiti)
   - `Seleziona primi 20`
   - `Azzera selezione`

## Regole convocazioni per categoria

- `UNDER14I` e `UNDER14F`: **nessun prestito** da altre squadre.
- `UNDER15F`: può convocare anche da `UNDER14F`.
- `UNDER16D`: può convocare anche da `UNDER15F`.
- `UNDER17E`: può convocare anche da `UNDER16D`.

## Note dati

- Esclusione automatica del campionato `SECONDA CATEGORIA`.
- `CAMPO ESTESO` letto con priorità dalla colonna J del foglio gare.
- Calciatori letti con priorità dal CSV dedicato (`gid=813287810`) con fallback su `sheet=CALCIATORI`.
