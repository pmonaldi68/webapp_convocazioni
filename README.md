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
4. In basso trovi:
   - elenco giocatori della **squadra principale**;
   - pulsante finale `Carica giocatori in prestito consentiti` che apre un elenco separato.
5. Per ogni giocatore puoi indicare:
   - convocato (checkbox principale)
   - 🅲 Capitano
   - 🆅 Vice Capitano
   - 🚩 Guardalinee

## Regole convocazioni per categoria

- `UNDER14I` e `UNDER14F`: nessun prestito da altre squadre.
- `UNDER15F`: può convocare anche da `UNDER14F`.
- `UNDER16D`: può convocare anche da `UNDER15F`.
- `UNDER17E`: può convocare anche da `UNDER16D`.

## Note dati

- Esclusione automatica del campionato `SECONDA CATEGORIA`.
- `CAMPO ESTESO` letto con priorità dalla colonna J del foglio gare.
- Calciatori letti con priorità dal CSV dedicato (`gid=813287810`) con fallback su `sheet=CALCIATORI`.
