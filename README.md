# webapp_convocazioni

Web app minimale per gestire le convocazioni settimanali da smartphone.

## Avvio locale

```bash
python3 -m http.server 8000
```

Apri `http://localhost:8000`.

## Funzionalità

- Caricamento automatico da Google Sheets pubblici: gare, giocatori, allenatori e dirigenti (le squadre vengono ricavate automaticamente dai dati caricati).
- Flusso guidato: prima selezione squadra, poi selezione gara.
- Filtro automatico per mostrare solo giocatori/staff della squadra scelta.
- Selezione rapida dei convocati.
- Generazione messaggio pronto per copia/condivisione (WhatsApp o share nativa mobile).
