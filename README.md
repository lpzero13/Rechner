# Aktien-Positionsrechner 1.4

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

## Optionaler Zeitraum in Schritt 3 ab Version 1.3

Ein **Kaufdatum** und ein **Verkaufsdatum** ordnen das fiktive Ergebnis einer Haltedauer zu. Beide Felder starten leer und sind optional: Die Kurs- und Kostenrechnung bleibt unabhängig von fehlenden oder fehlerhaften Daten verfügbar. Bei einem gültigen Zeitraum wird beispielsweise **„388,00 € nach Orderkosten in 14 Kalendertagen (01.10.2026 – 15.10.2026)“** angezeigt.

Die Haltedauer ist die Differenz zwischen den beiden Kalenderdaten, einschließlich Wochenenden und Feiertagen. Kauf und Verkauf am selben Tag bedeuten 0 Tage. UTC-basierte Kalenderarithmetik verhindert falsche Tageszahlen an Sommerzeitwechseln; Schaltjahre und ungültige Daten werden ausdrücklich geprüft. Ein Verkaufsdatum vor dem Kaufdatum zeigt einen Fehler direkt am Feld und keine veraltete Haltedauer.

Zusätzlich erscheint das **Ergebnis nach Kosten je Kalendertag, Ø**: fiktiver Nettogewinn oder -verlust geteilt durch die Haltedauer, auf Cent gerundet. Beispiel: 388 € / 14 Tage = 27,71 € pro Kalendertag. Bei 0 Tagen oder fehlendem Kursszenario gibt es keinen Tagesdurchschnitt. Dies ist nur eine rechnerische Verteilung des Gesamtergebnisses, keine Aussage über tatsächliche tägliche Gewinne. Die bisherige Prozent-Rendite gilt für die gesamte Position; es findet keine Hochrechnung auf Jahresrenditen statt.

Die Datumseingaben verändern weder Aktienzahl noch Gebührenmodell, werden nicht gespeichert und beim Neuladen oder Wiederherstellen aus dem Verlauf zusammen mit dem Verkaufskurs zurückgesetzt.

## Eingabekomfort ab Version 1.4

Der **Depotwert** wird beim Verlassen des Feldes mit deutschen Tausenderpunkten und zwei Centstellen dargestellt: `10000` → `10.000,00`, `1234567,89` → `1.234.567,89`. Beim Tippen findet keine Umformatierung statt, sodass die Schreibposition erhalten bleibt. Die Formatierung verwendet ebenfalls BigInt-Cents und verändert den Zahlenwert nicht. Ungültige oder unvollständige Eingaben werden nicht stillschweigend korrigiert.

**Kauf- und Verkaufsdatum** sind jetzt frei beschreibbare Textfelder für die deutsche Schreibweise. `12.12.25` wird beim Verlassen des Feldes zu `12.12.2025`. Möglich sind auch `1.2.25`, `12.12.2025`, `121225` und `12122025`. Zweistellige Jahreszahlen bedeuten ausdrücklich **2000 bis 2099**; für andere Jahrhunderte das Jahr vierstellig eingeben, etwa `01.01.1999`. ISO-Werte wie `2025-12-12` bleiben für die Berechnungsfunktionen kompatibel.

Unvollständige Datumseingaben bleiben während der Eingabe neutral. Ungültige Tage wie `31.04.25` werden nicht auf ein anderes Datum verschoben. Die Haltedauer verwendet intern weiterhin normalisierte ISO-Kalendertage; Kosten, Aktienanzahl und Gewinnrechnung bleiben unverändert. Nach dem Neuladen bleiben die Eingabefelder wie bisher leer.

## Tests

Aus dem Repositoryordner:

```text
node --test tests/calculations.test.cjs tests/app.test.cjs
```

Tests für sämtliche Beispielwerte, Presets, freien Risikowert, Stop-Abstände, Kapitalgrenze, Nullpositionen, Validierung, deutsche Formate, Cent-Rundung, große Zahlen und 2.000 deterministische Grenzprüfungen. Node wird ausschließlich zum Testen benötigt.

`src/numbers.js` enthält Parser und Ausgabeformatierung, `src/calculations.js` die unabhängig testbare Berechnung, `src/main.js` verbindet diese mit der Oberfläche.

## Dateien aktualisieren und Cache-Konsistenz

CSS und JavaScript werden in `index.html` mit einem Inhalts-Hash in der URL eingebunden, zum Beispiel `src/main.js?v=...`. Geänderter Inhalt erhält damit eine neue Cache-Adresse. Dies verhindert, dass eine neue HTML-Oberfläche unbemerkt mit altem JavaScript oder ohne die zugehörigen neuen CSS-Regeln geöffnet wird. Alle vier Dateien sind gemeinsam erfasst; die Prüfung erkennt veraltete Versionsverweise auch unter Windows und Linux.

Nach Änderungen an CSS oder JavaScript aus dem Repositoryordner ausführen:

```text
node tools/update-assets.cjs
node --test tests/calculations.test.cjs tests/app.test.cjs
```

Die aktualisierte `index.html` zusammen mit den geänderten Quellen committen. Der Helfer gehört ausschließlich zum Entwicklungsablauf: Die ausgelieferte App bleibt ohne Build, Node-Runtime oder Backend nutzbar. Der Testlauf schlägt fehl, wenn Hash und Dateiinhalte nicht mehr übereinstimmen.

Auf dem Webserver sämtliche Projektdateien aus demselben Commit aktualisieren, etwa bei sauberem Checkout mit `git pull --ff-only`. HTML sollte vom statischen Server mit `Cache-Control: no-cache` ausgeliefert werden, damit der Browser neue Asset-Verweise revalidiert. Ein GitHub-Upload allein aktualisiert keinen separat betriebenen Webserver. Nach einem bestehenden veralteten Seitenstand einmal vollständig neu laden (`Strg+Umschalt+R`); dabei werden wie bisher die Eingaben verworfen.

Ein sichtbarer Ladehinweis bleibt stehen, wenn die App nicht vollständig startet. Statt unerklärter leerer Ergebnisse wird außerdem bei einem Skriptfehler eine Fehlermeldung angezeigt. Der Hinweis verschwindet erst nach erfolgreicher Initialisierung aller Berechnungsansichten.

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

## Ergänzende Abnahme der Version 1.3 am 25.10.2026

- 73 automatisierte Tests bestanden. Zusätzliche Prüfungen für 14-Tage-Beispiel, 0 Tage, Wochenenden, Sommer-/Winterzeitwechsel, gregorianische Schaltjahre, Jahreswechsel, frühe Jahre, ungültige oder unvollständige Daten, umgekehrte Zeiträume, positive/negative Cent-Rundung und große Beträge. Zeitraum und Kursergebnis bleiben unabhängig.
- Im Browser 14-Tage-Beispiel, Verlust, gleicher Tag, fehlendes Datum und umgekehrte Reihenfolge geprüft. Datumsfelder und Ergebnisse auf Desktop und bei 320 Pixeln in Hell/Dunkel ohne horizontalen Überlauf kontrolliert. Neuladen leert beide Daten und den Verkaufskurs; keine JavaScript-Konsolenfehler.

## Fehlerkorrektur 1.3.1 am 25.10.2026

Die unveränderten Asset-Adressen ließen einen Versionsmix zu: Die aktuelle HTML-Datei zeigte Schritt 3 bereits an, während altes JavaScript aus Version 1.1 nur Schritt 1/2 bediente und alte CSS-Regeln die neue Karte nicht gestalteten. Dieser Zustand wurde auf Codeebene mit dem tatsächlichen alten JavaScript und dem aktuellen HTML reproduziert. Die frühere Rechentestsuite erfasste die Verbindung zwischen HTML, Formularevents und Ergebnisanzeige nicht.

Korrektur: inhaltsabhängige Asset-Adressen und ein sichtbarer Initialisierungs-/Fehlerhinweis. Zusätzlich sieben Integrationstests gegen die tatsächlich ausgelieferte HTML-Datei und die echten JavaScript-Dateien in einer minimalen DOM-/Ereignis-Testumgebung. Diese Umgebung prüft die Anwendungsverdrahtung; sie ist kein Browser oder Layouttest. Nach der ausdrücklichen Bitte des Nutzers erfolgte die weitere Fehlerprüfung ausschließlich am Code.

**80 Tests bestanden:** 73 Berechnungs-/Validierungstests und sieben App-Integrationstests. Sie prüfen den gemeldeten Fall über Formulareingaben, Brokerwechsel, Verluste, ungültige Eingaben, Rücksetzen der Formulare, Startfehler und die Asset-Hashes. Eingaben 10.000 € Depot, 1 % Risiko, Kauf 200,09 €, Stop 197,59 €, Trade Republic Bestpreis, Verkauf 300,99 € und 21.08.2025–17.12.2026 ergeben: **39 Aktien, Kaufbetrag 7.804,51 €, Kursgewinn 3.935,10 €, 2 € Orderkosten, fiktiver Nettogewinn 3.933,10 €, 483 Kalendertage und durchschnittlich 8,14 € pro Kalendertag**, vor Steuern.

## Ergänzende Abnahme der Version 1.4 am 25.10.2026

**92 Tests bestanden:** Zusätzlich acht Formatierungs-/Validierungstests und vier App-Integrationstests für das Verlassen der Felder, unveränderte Ergebnisse, kurze/ausgeschriebene/kompakte Daten, Jahrhundertregel, Schaltjahre, ungültige und unvollständige Eingaben, große centgenaue Depotwerte und leere Felder nach dem Zurücksetzen. Die Eingabehilfen wurden auf Codeebene einschließlich der HTML-/Ereignis-Anbindung geprüft; kein zusätzlicher Browserlauf.
