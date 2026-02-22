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
3. L'app compila automaticamente i campi della prossima gara (in base alla data odierna):
   - DATA
   - ORA
   - CAMPIONATO
   - GIRONE
   - GARA
   - SQUADRA CASA
   - SQUADRA OSPITE
   - CAMPO ESTESO
   - LNK MAPS

## Dati

- Fonte unica Google Sheet pubblicato (`pub?output=csv`) per le gare.
- Foglio secondario (stesso documento) usato per la mappatura `categoria -> società`.


## Nota categorie U14

- Mappatura forzata gestita in app:
  - `UNDER14I` -> `ALBACYNTHIA`
  - `UNDER14F` -> `ACADEMY CYNTHIA GENZANO`

- Esclusione automatica del campionato `SECONDA CATEGORIA` dalla selezione.
- `CAMPO ESTESO` letto con priorità dalla colonna J del foglio gare (comprensiva di indirizzo).
