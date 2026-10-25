# Aktien-Positionsrechner 1.2

Eigenständige deutsche Web-App aus HTML, CSS und Vanilla JavaScript. Keine Installation, kein Build, keine Runtime-Abhängigkeiten und kein Backend.

## Öffnen

`index.html` direkt im aktuellen Chrome, Edge, Firefox oder Safari öffnen. Alternativ aus diesem Ordner einen rein lokalen statischen Dateiserver starten:

```text
python -m http.server 8847 --bind 127.0.0.1
```

Dann `http://127.0.0.1:8847/` öffnen. Der Server stellt ausschließlich Dateien bereit; alle Berechnungen laufen im Browser.

## Bedienung und Datenschutz

Depotwert, Kaufkurs und Stop sind beim Öffnen leer, Risiko ist 1 %. Die Presets 0,5 %, 1 % und 2 % sowie freie Risikowerte aktualisieren das Ergebnis sofort. Geldwerte akzeptieren bis zu zwei Nachkommastellen, etwa `47,50` oder `10.000,00`. Ein ungruppierter Dezimalpunkt wie `47.50` ist ebenfalls möglich; `1.000` bedeutet nach deutscher Schreibweise eintausend. Ein noch nicht abgeschlossener Dezimalwert wie `47,` wird neutral behandelt.

Die Oberfläche folgt zunächst dem Systemthema. Die Auswahl oben bietet System, Hell und Dunkel. Der Dark Mode verwendet dunkle Blau-Grau-Flächen, getrennte Eingabeflächen, helle Texte sowie dezente grüne und rote Akzente. Im Systemmodus werden auch laufende Änderungen der Systemeinstellung berücksichtigt; explizites Hell/Dunkel bleibt davon unabhängig. Tastaturbedienung, beschriftete Felder, verknüpfte Fehlertexte und eine Live-Statusmeldung sind vorhanden. Layout ab 320 CSS-Pixeln.

Kein Local Storage, Session Storage, Cookie, Tracking, externer Font oder Kursabruf. Kein Finanzwert wird dauerhaft gespeichert oder übertragen; auch beim Neuladen und bei der Wiederherstellung aus dem Seitenverlauf werden die Eingaben zurückgesetzt. Der Darstellungsmodus wird ebenfalls nicht gespeichert. Eine Content Security Policy blockiert Netzwerkverbindungen aus der App. Die Eingabelänge ist auf 120 Zeichen begrenzt; längere Zahlen werden mit einem Fehler abgewiesen.

## Berechnung

Geldwerte werden aus Text direkt in `BigInt`-Centbeträge übersetzt. Risikoprozente bleiben exakte dezimale Brüche. Bruchteile eines Cents beim Risikobudget werden vorsichtig abgerundet; die Aktienanzahl wird aus dem Minimum von Risikobudget und theoretischer Depotfinanzierung abgerundet. Es entstehen weder Gleitkommafehler bei Geldwerten noch Bruchstückaktien. Prozentanzeigen werden erst zur Ausgabe auf zwei Stellen kaufmännisch gerundet.

Verbindliches ursprüngliches Beispiel im Modell **Ohne Kosten · Vergleich**: 10.000 € Depot, 1 % Risiko, Einstieg 50 €, Stop 47,50 € → 40 Aktien, 2.000 € Kaufbetrag, 100 € geplanter Verlust, 20 % Depotanteil, 5 % Stop-Abstand. Ziel 57,50 € (+15 %), rechnerischer Gewinn 300 €. Die Originalspec liegt unverändert in `SPEC.md`; Version 1.1 erweitert sie auf Nutzerauftrag um Orderkosten und den überarbeiteten Darstellungsmodus.

## Orderkosten ab Version 1.1

Standard in der Oberfläche ist **Trade Republic · Bestpreis**. Keine Brokerverbindung und keine automatische Tarifaktualisierung. Presets sind transparente Schätzmodelle für Euro-Aktien-Einzelorders; die Kosteninformation vor der Order ist maßgeblich. Sparpläne, Aktionen, Steuern, Teilausführungen und Fremdwährungsorders werden nicht automatisch modelliert.

| Modell | Annahme je Kauf / Verkauf |
| --- | --- |
| Trade Republic Bestpreis | 1,00 € je Order |
| Trade Republic Direktpreis | 2,00 € je Order |
| ING Standard | 4,90 € + 0,25 % des jeweiligen Kurswerts, Provision höchstens 69,90 €; zusätzlicher frei eingebbarer Handelsplatzbetrag |
| ING Young | 1,90 € je Order plus Handelsplatzbetrag; nur bei gültigen Young-Konditionen |
| Manuell | Unterschiedliche feste Gesamtbeträge für Kauf und Verkauf; Verkaufsbetrag gilt am Stop und an jedem Ziel |
| Ohne Kosten | Ursprüngliche Vergleichsrechnung |

Quellen, am **24.10.2026** geprüft: [ING Preisverzeichnis](https://www.ing.de/preis-leistungsverzeichnis/), [ING Preisverzeichnis als Dokument, Stand 10.02.2026](https://www.ing.de/dokumente/direkt-depot-auszug-plv/), [Trade Republic Preise](https://traderepublic.com/de-de?openModal=pricing-scheme), [Trade Republic Direktpreis](https://support.traderepublic.com/de-de/835f9deb-b864-4587-b428-7facfc55296c). ING-Direkthandel ohne Handelsplatzbetrag; Xetra beispielsweise 2,90 € je Order. Handelsplatz-/Zusatzkosten gelten im Modell symmetrisch; bei unterschiedlichen Beträgen die manuelle Gesamtkosteneingabe verwenden.

Für jede mögliche Aktienzahl `n` gelten beide Grenzen:

```text
n × (Kaufkurs − Stop) + Kaufkosten(n × Kaufkurs) + Verkaufskosten(n × Stop) ≤ Risikobudget
n × Kaufkurs + Kaufkosten(n × Kaufkurs) ≤ Depotwert
```

Die größtmögliche ganze Aktienzahl wird mit einer monotonen binären Suche ermittelt. ING-Provision wird je Order kaufmännisch auf Cent gerundet, dann auf 69,90 € begrenzt; Handelsplatzkosten kommen anschließend dazu. Dies ist eine dokumentierte Modellannahme, keine Garantie einer identischen Brokerabrechnung. Am Ziel wird die Verkaufsgebühr aus dem dortigen höheren Kurswert neu berechnet. Bei null Aktien fallen keine Kosten an.

Der ursprüngliche Kurs `Kaufkurs + 3 × Stop-Abstand` bleibt sichtbar als **3:1-Kurs vor Kosten**. Darunter stehen Gewinn und Chance-Risiko-Verhältnis nach den modellierten Orderkosten, vor Steuern. Der Nettogewinn kann trotz Kursanstieg negativ sein. Zusätzlich werden die **Gewinnschwelle je Aktie** und der kleinste volle Centkurs für **mindestens 3:1 nach Kosten** berechnet. Bei null Aktien sind diese positionsbezogenen Kurse und das Verhältnis nicht definiert und werden als Gedankenstrich gezeigt. Die Netto-Kurse berücksichtigen auch die am jeweiligen Verkaufskurs neu berechnete Gebühr. Aufrundung auf volle Kurs-Cents kann das Verhältnis leicht über 3:1 heben. Prozentanzeigen runden auf zwei Stellen; etwa 0,995 % erscheint als 1,00 %.

| Beispiel mit 10.000 € / 1 % / Kauf 50 € / Stop 47,50 € | Ohne Kosten | TR Bestpreis | ING Standard, Direkthandel |
| --- | ---: | ---: | ---: |
| Aktien | 40 | 39 | 32 |
| Kaufbetrag inkl. Kaufkosten | 2.000,00 € | 1.951,00 € | 1.608,90 € |
| Gesamter Stop-Verlust | 100,00 € | 99,50 € | 97,60 € |
| Davon Kauf + Verkauf am Stop | 0,00 € | 2,00 € | 17,60 € |
| Gewinn bei 57,50 € nach Orderkosten | 300,00 € | 290,50 € | 221,60 € |
| Chance / Risiko nach Kosten | 3,00 : 1 | 2,92 : 1 | 2,27 : 1 |
| Kurs für mindestens 3:1 nach Kosten | 57,50 € | 57,71 € | 59,74 € |

Spreads sind keine bekannte feste Ordergebühr. Der Einstieg sollte der erwartete Kauf-Ausführungskurs in Euro sein. Ein bereits im Ausführungskurs enthaltener Spread darf nicht nochmals als Gebühr erfasst werden. Unsichere Stop-Ausführung und Slippage bleiben durch das Risikobudget nicht garantiert begrenzt. Keine automatische Steuer- oder Währungsberechnung.

Die Depotwertgrenze prüft keine freie Liquidität. Alle Eingaben müssen in Euro vorliegen. Das Risiko ist kein garantiertes Verlustmaximum: Gaps, Ausführungspreise und Gebühren können tatsächliche Verluste erhöhen. Der 3:1-Kurs ist eine Orientierung, keine Prognose. Keine Brokerorders oder automatische Stop-Bestimmung.

## Schritt 3: fiktiver Gewinn / Verlust ab Version 1.2

Die separate Karte **Was wäre, wenn?** übernimmt die ganze Aktienanzahl und den Kaufkurs aus Schritt 2. Ein optionaler **angenommener Verkaufskurs je Aktie** berechnet sofort das Ergebnis eines vollständigen Verkaufs dieser Position. Der Szenariokurs wird nicht zur Bestimmung der Positionsgröße verwendet. Änderungen der Ausgangslage oder des Kostenmodells aktualisieren auch Schritt 3; ungültige oder fehlende Basiseingaben löschen veraltete Szenarioergebnisse.

```text
Verkaufswert = Aktienanzahl × angenommener Verkaufskurs
Kursgewinn / -verlust = Aktienanzahl × (Verkaufskurs − Kaufkurs)
Fiktiver Gewinn / Verlust nach Orderkosten = Kursgewinn / -verlust − Kaufkosten − Verkaufskosten
Rendite = fiktives Ergebnis / Kaufbetrag einschließlich Kaufkosten × 100
Depotauswirkung = fiktives Ergebnis / ursprünglicher Depotwert × 100
```

Die Kaufkosten werden genau einmal abgezogen. ING-Verkaufskosten werden aus dem tatsächlichen Szenario-Verkaufswert neu berechnet, einschließlich Provisionsdeckel und Handelsplatzzuschlag. Für manuell eingetragene Kosten gilt der gleiche feste Verkaufsbetrag wie in Schritt 2. Alle Geldbeträge werden weiterhin ausschließlich mit ganzzahligen BigInt-Cents gerechnet; prozentuale Gewinne und Verluste erhalten ein passendes Vorzeichen.

Beispiel mit 10.000 € Depot, 1 % Risiko, Kauf 50 €, Stop 47,50 € und Trade Republic Bestpreis: 39 Aktien. Bei einem angenommenen Verkauf zu **60 €** ergibt das **390 € Kursgewinn − 1 € Kaufkosten − 1 € Verkaufskosten = 388 € fiktiven Gewinn nach Orderkosten**, vor Steuern. Das entspricht 19,89 % auf die 1.951 € Kaufbetrag und 3,88 % des Depots. Zu 45 € wären es 197 € Verlust einschließlich Kosten. Bei ING Standard ohne Handelsplatzzuschlag sind es bei 60 € und den dort berechneten 32 Aktien 301,40 € nach 8,90 € Kauf- und 9,70 € Verkaufskosten.

Der Verkaufskurs muss größer als null sein und darf maximal zwei Nachkommastellen enthalten. Kurse unter dem Einstieg sind ausdrücklich zulässig. Leer oder unvollständig gelassene Szenariokurse beeinflussen Schritt 2 nicht. Bei null Aktien oder fehlender Position werden keine Szenarioergebnisse oder Prozentwerte angezeigt. Das Feld startet leer und wird beim Neuladen beziehungsweise Wiederherstellen aus dem Seitenverlauf zurückgesetzt; keine Speicherung oder Übertragung.

Die Rechnung ist eine reine Kursannahme vor Steuern, kein realisierter Gewinn und keine Prognose. Sie setzt voraus, dass alle Aktien bis zum angenommenen Verkauf gehalten werden. Insbesondere wird kein zwischenzeitlicher Kursverlauf mit möglicher Stop-Ausführung simuliert. Bestehende Hinweise zu Spreads, Ausführungsabweichungen und Euro-Währung gelten weiter.

## Tests

Aus dem Repositoryordner:

```text
node --test tests/calculations.test.cjs
```

Tests für sämtliche Beispielwerte, Presets, freien Risikowert, Stop-Abstände, Kapitalgrenze, Nullpositionen, Validierung, deutsche Formate, Cent-Rundung, große Zahlen und 2.000 deterministische Grenzprüfungen. Node wird ausschließlich zum Testen benötigt.

`src/numbers.js` enthält Parser und Ausgabeformatierung, `src/calculations.js` die unabhängig testbare Berechnung, `src/main.js` verbindet diese mit der Oberfläche.

## Abnahme am 24.10.2026

- 49 automatisierte Tests einschließlich 2.000 deterministischer Grenzfälle und 300 unabhängiger vollständiger Vergleichssuchen über alle sechs Kostenmodelle bestanden. Geprüft werden Brokerbeispiele, Provisionsdeckel, Centhälften, zusätzliche Handelsplatzkosten, negative Nettoergebnisse, Kapitalgrenze einschließlich Kaufkosten, Nullpositionen und aktive/inaktive Gebührenfelder.
- Echter Browser über lokalen statischen HTTP-Server: verbindliches Beispiel, Presets, freie Eingaben, Brokerwechsel, manuelle Gebühren, Fehler, Kapitalgrenze und Nullposition geprüft. Keine JavaScript-Konsolenfehler.
- Desktop und 320-Pixel-Ansicht in Hell/Dunkel visuell geprüft, ohne horizontalen Überlauf bei den Beispielwerten. Mobilprüfung per Browser-Viewport, kein physisches Smartphone.
- Tab-Reihenfolge, sichtbarer Fokus, Preset per Leertaste und Texteingabe geprüft. Neuladen verwirft die Eingaben und stellt die beschriebenen Voreinstellungen wieder her.
- Direkter `file://`-Start konnte im automatisierten Vorschau-Browser nicht abgenommen werden, da dessen Sicherheitsrichtlinie nur HTTP(S) erlaubt. Die lokale HTTP-Variante wurde erfolgreich geprüft.
- GitHub Actions führt die Tests unter Windows und Linux mit Node.js 24 aus. Node wird nur für Tests benötigt. Das Repository enthält keinen automatischen Website-Deploy.

## Ergänzende Abnahme der Version 1.2 am 25.10.2026

- 61 automatisierte Tests bestanden. Neue Prüfungen umfassen freie Verkaufskurse, Gewinn und Verlust, identischen Kauf-/Verkaufskurs, alle Kostenmodelle, Gebühren genau einmal, ING-Provisionsdeckel, große centgenaue Beträge, Nullpositionen, optionale Feldvalidierung und unveränderte Positionsgröße. Szenarioergebnisse stimmen am Stop, am bestehenden 3:1-Ziel, an der Gewinnschwelle und am Ziel nach Kosten mit Schritt 2 überein.
- Browserprüfung des TR-/ING-Beispiels, Verlustrechnung, ungültigem Verkaufskurs sowie dem Entfernen veralteter Ergebnisse bei leerer Ausgangslage oder null Aktien.
- Schritt 3 auf Desktop und bei 320 Pixeln Breite in Hell und Dunkel visuell geprüft, ohne horizontalen Überlauf. Nach dem Neuladen ist auch der Szenariokurs wieder leer; keine JavaScript-Konsolenfehler.
