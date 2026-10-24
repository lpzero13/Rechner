# Aktien-Positionsrechner – Produktspezifikation v1.0

**Projektart:** Eigenständige Web-Anwendung  
**Technologie:** HTML, CSS und Vanilla JavaScript  
**Zielplattform:** Desktop und Smartphone  
**Sprache:** Deutsch  
**Konzept:** Modernes, minimalistisches Finanztool ohne Backend

---

## 1. Produktziel

Die Anwendung berechnet für Aktienkäufe eine geeignete Positionsgröße anhand eines festgelegten prozentualen Verlustrisikos.

Der Nutzer bestimmt seinen Depotwert, das gewünschte Risiko, den Einstiegskurs und den Stop-Loss-Kurs. Die Anwendung zeigt unmittelbar, wie viele ganze Aktien nach dem Risikomodell gekauft werden können.

Das Produkt soll besonders einfach und verständlich sein. Die wesentliche Information lautet:

**„Wie viele Aktien kann ich bei diesem Kurs und Stop-Loss kaufen, damit mein geplanter Verlust innerhalb meines Risikobudgets bleibt?“**

Zusätzlich wird ein rein informativer Zielkurs für ein Chance-Risiko-Verhältnis von 3:1 berechnet.

## 2. Eingaben

| Eingabefeld | Beschreibung |
|---|---|
| Aktueller Depotwert (€) | Gesamtwert des Depots |
| Risiko pro Trade (%) | Schnellwahl 0,5 %, 1 %, 2 % oder freier Wert |
| Geplanter Kaufkurs je Aktie (€) | Manuell eingetragener Einstiegskurs |
| Dein Stop-Loss-Kurs (€) | Manuell festgelegter Kurs, unterhalb des Kaufkurses |

Der Stop-Loss wird ausschließlich als konkreter Kurs eingegeben. Es findet keine automatische Stop-Bestimmung durch Indikatoren oder Prozentabstände statt.

Die Risikoauswahl soll die Voreinstellung 1 % besitzen. Alle übrigen Eingabefelder sind beim Start leer.

## 3. Berechnungen und Ergebnisse

Aus den vier Eingabewerten werden automatisch folgende Größen ermittelt:

- Risikobudget in Euro.
- Verlust pro Aktie beim Stop-Loss.
- Maximale ganze Aktienanzahl nach dem Risikobudget.
- Benötigter Kaufbetrag.
- Geplanter Gesamtverlust am Stop-Loss in Euro.
- Tatsächlich ausgeschöpftes Risiko als Prozent des Depots.
- Anteil der Position am Depot.
- Abstand zwischen Einstieg und Stop-Loss in Prozent.
- Informativer Kurs für ein Chance-Risiko-Verhältnis von 3:1.
- Erforderlicher Kursanstieg in Prozent bis zum 3:1-Ziel.
- Rechnerischer Gesamtgewinn bei Erreichen des 3:1-Ziels.

Die Aktienanzahl wird grundsätzlich abgerundet.

Zusätzlich wird ausgeschlossen, dass der berechnete Kaufbetrag den gesamten Depotwert überschreitet. Diese theoretische Kapitalgrenze ersetzt keine Prüfung tatsächlich vorhandener Liquidität.

## 4. Berechnungslogik

**Risikobudget:**

Risikobudget = Depotwert × Risikoprozent / 100

**Verlust pro Aktie:**

Verlust pro Aktie = Kaufkurs − Stop-Loss-Kurs

**Aktienanzahl nach Risikobudget:**

Aktienanzahl = Abrunden (Risikobudget / Verlust pro Aktie)

**Kapitalbegrenzung:**

Endgültige Aktienanzahl = Minimum aus der Aktienanzahl nach Risikobudget und der mit dem Depotwert theoretisch finanzierbaren ganzen Aktienanzahl.

**Geplanter Gesamtverlust:**

Gesamtverlust = Aktienanzahl × Verlust pro Aktie

**3:1-Zielkurs:**

Zielkurs = Kaufkurs + 3 × Verlust pro Aktie

**Benötigter Kursanstieg:**

Kursanstieg in % = (Zielkurs − Kaufkurs) / Kaufkurs × 100

**Rechnerischer Gewinn bei 3:1:**

Gewinn = Aktienanzahl × (Zielkurs − Kaufkurs)

Für Geldbeträge ist eine centgenaue interne Berechnung zu verwenden. Die Anzahl der Aktien ist immer ganzzahlig.

## 5. Verbindliches Rechenbeispiel

| Position | Erwartetes Ergebnis |
|---|---:|
| Depotwert | 10.000,00 € |
| Risiko | 1 % |
| Kaufkurs | 50,00 € |
| Stop-Loss | 47,50 € |
| Risikobudget | 100,00 € |
| Verlust je Aktie | 2,50 € |
| **Aktienanzahl** | **40** |
| Kaufbetrag | 2.000,00 € |
| Geplanter Verlust | 100,00 € |
| Depotanteil | 20,00 % |
| Stop-Abstand | 5,00 % |
| **3:1-Zielkurs** | **57,50 €** |
| Kursanstieg bis 3:1 | +15,00 % |
| Gewinn bei 3:1 | +300,00 € |

Die Werte müssen bei identischen Eingaben reproduzierbar ausgegeben werden.

## 6. UX/UI-Konzept

Die Anwendung besteht aus einer einzigen Hauptansicht.

**Desktop:** Zweispaltiges Layout mit Eingabekarte links und Ergebniskarte rechts.

**Mobil:** Einspaltiges Layout mit Eingaben oben und Ergebnissen darunter.

### Eingabekarte

- Klar beschriftete Eingabefelder.
- Große, einfach bedienbare Risikopresets.
- Sinnvolle Beispielplatzhalter.
- Kleine Informationshinweise für nicht offensichtliche Begriffe.
- Keine überflüssigen Buttons.

### Ergebniskarte

Die Aktienanzahl ist das visuell wichtigste Element.

Danach folgen Kaufbetrag und geplanter Verlust. Weitere Kennzahlen werden kleiner dargestellt.

Der 3:1-Zielkurs erhält einen eigenen, visuell getrennten Bereich und wird als **Orientierung, nicht als Prognose** bezeichnet.

Ein kurzer Erklärungstext soll den Zusammenhang zwischen Kauf, Stop-Loss und Depotrisiko in Alltagssprache erläutern.

### Visuelles Design

- Hochwertiger minimalistischer Fintech-Stil.
- Dezente Karten mit abgerundeten Ecken.
- Klare Typografie und großzügige Abstände.
- Gut lesbare große Zahlen.
- Heller und dunkler Darstellungsmodus.
- Zurückhaltende Farbcodierung für Gewinne und Verluste.
- Responsive bis zu einer Breite von 320 Pixeln.
- Vollständige Tastaturbedienung und sichtbare Fokuszustände.

Die Oberfläche darf nicht den Charakter einer umfangreichen Tradingplattform besitzen.

## 7. Benutzerinteraktionen

Jede gültige Eingabeänderung aktualisiert alle abhängigen Ergebnisse automatisch.

Die drei Risikopresets setzen unmittelbar den entsprechenden Prozentwert. Ein manuell eingegebener Wert überschreibt die Auswahl.

Deutsche Dezimalformate müssen unterstützt werden, beispielsweise „47,50“.

Fehler erscheinen in unmittelbarer Nähe des betroffenen Feldes.

Bei leeren oder unvollständigen Eingaben wird eine neutrale Aufforderung angezeigt. Es dürfen keine ungültigen Rechenwerte wie „NaN“ oder „Infinity“ erscheinen.

Ein separater Berechnen-Button ist nicht erforderlich.

## 8. Sicherheits- und Plausibilitätsregeln

- Depotwert und Kaufkurs müssen größer als null sein.
- Der Stop-Loss muss größer als null und kleiner als der Einstiegskurs sein.
- Das Risiko muss größer als 0 % und höchstens 100 % sein.
- Geldwerte dürfen höchstens zwei Nachkommastellen besitzen.
- Keine negativen Aktienanzahlen.
- Keine Bruchstückaktien.
- Kein Kaufbetrag über dem Depotwert.
- Bei zu geringem Risikobudget erfolgt eine verständliche Meldung, dass keine ganze Aktie möglich ist.
- Wenn die Depotwertgrenze die Aktienzahl begrenzt, wird dies gesondert erläutert.

Die App muss eindeutig erklären, dass das gewählte Risikoprozent kein garantiertes Verlustmaximum ist. Kurssprünge, Ausführungspreise und Gebühren können den tatsächlichen Verlust verändern.

## 9. Technische Architektur

Die Anwendung wird vollständig im Browser ausgeführt.

**Vorgeschlagene Projektdateien:**

- `index.html` – semantische Struktur und Oberfläche.
- `src/styles.css` – Layout, Komponenten, responsives Design und Themes.
- `src/main.js` – Ereignissteuerung und Ergebnisdarstellung.
- `src/calculations.js` – reine Berechnungslogik.
- `src/numbers.js` – Zahlenvalidierung, deutsche Zahlenformate und Ausgabeformatierung.
- `tests/` – automatisierte Berechnungs- und Validierungstests.
- `README.md` – Dokumentation und lokale Startanleitung.

Ein leichtgewichtiges Entwicklungswerkzeug wie Vite ist zulässig. Ein Backend ist nicht erforderlich.

Die Berechnungslogik muss unabhängig von der Oberfläche testbar sein.

## 10. Datenschutz und Speicherung

Keine Registrierung, kein Konto, keine Datenbank und keine dauerhafte Speicherung von Depot- oder Kurswerten.

Bei einem Neuladen der Seite werden die eingegebenen Werte verworfen.

Keine Analytics, Tracking-Cookies oder Übertragung der Finanzdaten an Dritte.

## 11. Nicht Bestandteil der ersten Version

Nicht implementieren:

- Live-Aktienkurse oder Kurs-APIs.
- Broker- oder Depotverbindungen.
- Automatische Orderausführung.
- KI-Funktionen oder Aktienbewertungen.
- Technische Indikatoren und automatische Stop-Bestimmung.
- Historische Trades oder Portfolio-Tracking.
- Short-Positionen, Derivate oder Kryptowährungen.
- Automatische Steuer- oder Gebührenberechnung.
- Automatische Währungsumrechnung.

**Währungshinweis:** Version 1.0 rechnet ausschließlich in Euro. Bei USD-Aktien müssen Einstieg und Stop zuvor in Euro umgerechnet werden. Unterschiedliche Währungen dürfen nicht ungeprüft vermischt werden.

## 12. Qualitätssicherung

Die Implementierung benötigt automatisierte Tests für:

- Standardrechnung mit 1 % Risiko.
- Risikopresets 0,5 % und 2 %.
- Unterschiedliche Stop-Abstände.
- Depotwertbegrenzung.
- Zu kleines Risikobudget.
- Ungültige Stop-Loss-Kurse.
- Leere Eingaben.
- Deutsche Dezimalzahlen.
- Rundungsgenauigkeit.
- Berechnung des 3:1-Zielkurses.

Zusätzlich erfolgt eine visuelle Prüfung auf Desktop und Smartphone in hellem und dunklem Modus.

## 13. Abnahmekriterien

Version 1.0 ist fertig, wenn alle Pflichtwerte manuell eingegeben werden können, sämtliche Ergebnisse fachlich korrekt sind, die Oberfläche auf Mobilgeräten funktioniert und alle Eingabefehler verständlich behandelt werden.

Die Anwendung muss ohne Anmeldung, externe Kursdaten, Backend oder Speicherung nutzbar sein.

**Leitprinzip für die Umsetzung:** Die App soll sich wie ein durchdachtes, professionelles Finanzwerkzeug anfühlen, dabei aber bewusst so einfach bleiben wie ein guter Taschenrechner.