# Checklist conformità WCAG 2.1 livello AA (W3C)

Per essere **conformi al livello AA** bisogna soddisfare **tutti i 50 criteri di successo** dei livelli **A (30)** e **AA (20)**. La conformità AA include automaticamente tutto il livello A.

**Riferimento normativo (UE/Italia):** European Accessibility Act — Dir. (UE) 2019/882 → norma armonizzata **EN 301 549 v3.2.1** → **WCAG 2.1 AA**. Recepimento italiano: D.Lgs. 82/2022 (estensione L. 4/2004 "Stanca").

## Come leggere la colonna "Verifica"

| Simbolo | Significato |
|---|---|
| ✅ **Auto** | uno scanner automatico (axe/AccessScan) può dare verdetto completo (2 criteri) |
| 🟡 **Parziale** | lo scanner rileva *alcuni* fallimenti, ma il "superato" va confermato a mano (18 criteri) |
| 👁 **Manuale** | giudizio possibile **solo** da una persona, spesso con screen reader/tastiera (30 criteri) |

> Gli strumenti automatici intercettano ~30–40% dei problemi. I criteri 👁 e il "pass" dei 🟡 richiedono **test manuali** con tecnologie assistive reali (NVDA, VoiceOver) e navigazione da sola tastiera.

---

## Principio 1 — Percepibile

| Criterio | Liv. | Verifica | Cosa serve per essere a norma |
|---|:---:|:---:|---|
| **1.1.1** Contenuti non testuali | A | 🟡 | Ogni immagine/icona/grafico informativo ha un `alt` (o nome accessibile) equivalente; le immagini decorative hanno `alt=""`; i controlli non testuali (pulsanti-icona, campi) hanno un nome accessibile. |
| **1.2.1** Solo audio e solo video (preregistrato) | A | 👁 | Alternativa testuale per i contenuti solo-audio; alternativa testuale o traccia audio per i contenuti solo-video. |
| **1.2.2** Sottotitoli (preregistrati) | A | 🟡 | Tutti i video con parlato hanno sottotitoli sincronizzati (`<track kind="captions">`). |
| **1.2.3** Audiodescrizione o alternativa (preregistrato) | A | 👁 | Video preregistrati con audiodescrizione **oppure** una trascrizione testuale completa. |
| **1.2.4** Sottotitoli (in tempo reale) | AA | 👁 | I contenuti audio/video **in diretta** hanno sottotitoli in tempo reale. |
| **1.2.5** Audiodescrizione (preregistrata) | AA | 👁 | I video preregistrati hanno una traccia di **audiodescrizione**. |
| **1.3.1** Informazioni e correlazioni | A | 🟡 | La struttura (titoli, liste, tabelle con intestazioni, gruppi di campi, relazioni label↔campo) è espressa nel **markup**, non solo visivamente. |
| **1.3.2** Sequenza significativa | A | 👁 | L'ordine di lettura nel DOM corrisponde all'ordine logico/visivo. |
| **1.3.3** Caratteristiche sensoriali | A | 👁 | Le istruzioni non si basano **solo** su forma, dimensione, posizione o suono ("clicca il pulsante rotondo a destra"). |
| **1.3.4** Orientamento | AA | 👁 | Il contenuto funziona sia in verticale che in orizzontale (non forzare un solo orientamento). |
| **1.3.5** Identificare lo scopo dell'input | AA | 🟡 | I campi che raccolgono dati dell'utente hanno l'attributo `autocomplete` corretto (`email`, `tel`, `given-name`…). |
| **1.4.1** Uso del colore | A | 👁 | L'informazione non è veicolata dal **solo** colore (es. errori in rosso → aggiungere testo/icona). |
| **1.4.2** Controllo del sonoro | A | 👁 | L'audio che parte da solo per >3s deve poter essere messo in pausa/fermato o avere un controllo volume. |
| **1.4.3** Contrasto (minimo) | AA | 🟡 | Testo normale ≥ **4.5:1**, testo grande (≥24px o ≥19px bold) ≥ **3:1** rispetto allo sfondo. |
| **1.4.4** Ridimensionamento del testo | AA | 🟡 | Il testo si ingrandisce fino al **200%** senza perdita di contenuto/funzioni; niente `user-scalable=no`. |
| **1.4.5** Immagini di testo | AA | 👁 | Usare testo reale invece di immagini di testo (eccetto loghi o testo personalizzabile). |
| **1.4.10** Ridistribuzione (Reflow) | AA | 🟡 | A 320px di larghezza (o 400% di zoom) niente scorrimento su **due** direzioni; il contenuto si riflette su una colonna. |
| **1.4.11** Contrasto del contenuto non testuale | AA | 👁 | Componenti UI (bordi campi, icone, stati) e parti significative dei grafici ≥ **3:1**. |
| **1.4.12** Spaziatura del testo | AA | 🟡 | Nessuna perdita di contenuto aumentando interlinea 1.5, spaziatura paragrafi 2×, lettere 0.12em, parole 0.16em. |
| **1.4.13** Contenuto al passaggio del mouse o del focus | AA | 👁 | Tooltip/popover su hover/focus sono **dismissibili** (Esc), **hoverable** e **persistenti** finché serve. |

## Principio 2 — Utilizzabile

| Criterio | Liv. | Verifica | Cosa serve per essere a norma |
|---|:---:|:---:|---|
| **2.1.1** Tastiera | A | 🟡 | **Tutte** le funzioni sono operabili da sola tastiera (link, pulsanti, menu, slider, modali…). Elementi cliccabili non semantici → `<button>` o `role`+gestione tasti. |
| **2.1.2** Nessun impedimento all'uso della tastiera | A | 👁 | Il focus non resta "intrappolato" in un componente: si entra e si esce da tastiera. |
| **2.1.4** Scorciatoie da tastiera con un solo carattere | A | 👁 | Le scorciatoie a singolo carattere sono disattivabili, rimappabili o attive solo al focus. |
| **2.2.1** Regolazione dei tempi | A | 🟡 | I limiti di tempo (es. timer checkout) sono disattivabili, regolabili o estendibili con un avviso. |
| **2.2.2** Pausa, stop, nascondi | A | 🟡 | Contenuti in movimento/lampeggianti/auto-aggiornanti (caroselli, ticker) si possono mettere in pausa/fermare/nascondere. |
| **2.3.1** Tre lampeggiamenti o sotto la soglia | A | 👁 | Niente lampeggi più di **3 volte al secondo** (rischio epilessia). |
| **2.4.1** Salto di blocchi | A | 🟡 | Esiste uno **skip link** ("Salta al contenuto") o landmark per saltare i blocchi ripetuti. |
| **2.4.2** Titolo della pagina | A | ✅ | Ogni pagina ha un `<title>` descrittivo e univoco. |
| **2.4.3** Ordine del focus | A | 👁 | L'ordine di tabulazione segue una sequenza logica e coerente con la lettura. |
| **2.4.4** Scopo del collegamento (nel contesto) | A | 🟡 | Il testo di ogni link è comprensibile (evitare "clicca qui"); ogni link ha un nome accessibile. |
| **2.4.5** Differenti modalità | AA | 👁 | Ci sono almeno **due modi** per raggiungere una pagina (menu, ricerca, mappa del sito…). |
| **2.4.6** Intestazioni ed etichette | AA | 👁 | Titoli (`<h>`) ed etichette dei campi sono descrittivi del contenuto/scopo. |
| **2.4.7** Focus visibile | AA | 👁 | L'elemento con focus da tastiera ha un **indicatore visibile** (non rimuovere `outline` senza sostituirlo). |
| **2.5.1** Gesti del puntatore | A | 👁 | Gesti complessi (multi-tocco, percorso) hanno un'alternativa a **punto singolo**. |
| **2.5.2** Annullamento delle azioni del puntatore | A | 👁 | L'azione si attiva al rilascio (up-event) ed è annullabile trascinando via. |
| **2.5.3** Etichetta nel nome | A | 🟡 | Il nome accessibile contiene il **testo visibile** del controllo (per i comandi vocali). |
| **2.5.4** Attivazione tramite movimento | A | 👁 | Funzioni attivate dal movimento del dispositivo hanno alternativa UI e si possono disattivare. |

## Principio 3 — Comprensibile

| Criterio | Liv. | Verifica | Cosa serve per essere a norma |
|---|:---:|:---:|---|
| **3.1.1** Lingua della pagina | A | ✅ | L'elemento `<html>` ha l'attributo `lang` corretto (es. `lang="it"`). |
| **3.1.2** Lingua di una parte | AA | 🟡 | I passaggi in lingua diversa hanno il proprio `lang`. |
| **3.2.1** Al focus | A | 👁 | Mettere il focus su un elemento **non** provoca un cambio di contesto (apertura finestre, submit). |
| **3.2.2** All'input | A | 👁 | Modificare un campo non provoca cambi di contesto inattesi (auto-submit senza preavviso). |
| **3.2.3** Navigazione coerente | AA | 👁 | I blocchi di navigazione ripetuti compaiono nello **stesso ordine** in tutte le pagine. |
| **3.2.4** Identificazione coerente | AA | 👁 | Componenti con la stessa funzione sono identificati in modo coerente (stessa icona/etichetta). |
| **3.3.1** Identificazione degli errori | A | 👁 | Gli errori di input sono identificati e descritti **testualmente** all'utente. |
| **3.3.2** Etichette o istruzioni | A | 🟡 | Ogni campo ha una `<label>` o istruzioni chiare su cosa inserire. |
| **3.3.3** Suggerimento per gli errori | AA | 👁 | Quando possibile, viene suggerita una **correzione** per l'errore. |
| **3.3.4** Prevenzione degli errori (legali, finanziari, dati) | AA | 👁 | Per dati legali/finanziari: l'azione è **reversibile**, **verificabile** o richiede **conferma** esplicita. |

## Principio 4 — Robusto

| Criterio | Liv. | Verifica | Cosa serve per essere a norma |
|---|:---:|:---:|---|
| **4.1.1** Elaborazione (Parsing) | A | 🟡 | Markup ben formato (no id duplicati, tag annidati correttamente). *Nota: rimosso/sempre soddisfatto in WCAG 2.2.* |
| **4.1.2** Nome, ruolo, valore | A | 🟡 | Ogni componente UI (custom incluso) espone **nome, ruolo e stato** corretti via HTML semantico o ARIA. |
| **4.1.3** Messaggi di stato | AA | 👁 | Notifiche dinamiche (aggiunto al carrello, errori, conteggi) annunciate via `role="status"`/`role="alert"`/`aria-live` senza spostare il focus. |

---

## Riepilogo

- **50 criteri** totali per il livello AA (30 di livello A + 20 di livello AA).
- **2** verificabili in automatico in modo completo (✅) · **18** parzialmente (🟡) · **30** solo manualmente (👁).
- Oltre ai criteri tecnici, l'**EAA** richiede anche: dichiarazione di accessibilità pubblicata (pagina HTML), meccanismo di feedback attivo, informazioni di accessibilità del servizio.

## Processo di verifica consigliato

1. **Scanner automatico** (AccessScan/axe) sulle pagine chiave → intercetta i 🟡 più evidenti.
2. **Revisione del codice** → struttura, ARIA, gestione tastiera, form.
3. **Test manuale con tecnologie assistive**: NVDA + Firefox/Chrome, VoiceOver + Safari, navigazione **solo tastiera** sui flussi critici.
4. **Dichiarazione di accessibilità** mantenuta a ogni rilascio, con i contenuti non accessibili residui e le tempistiche di risoluzione.
