# Verify

1. Acceptance aus `context/current-feature.md` bis `## History` lesen.
2. Die Gates gemäß `context/ai-interaction.md` §Workflow in der dort festgelegten
   Reihenfolge ausführen. Bei Fehler stoppen, Ursache und relevante Fehlerzeilen
   melden. Während der Reparatur gezielt prüfen; vor Abschluss müssen alle Gates
   auf dem finalen Stand grün sein. Einen unveränderten, bereits geprüften Stand
   nicht erneut prüfen, nur weil eine weitere Action beginnt.
3. Bei UI-Änderungen den Dev-Server starten, den Acceptance-Klickpfad im Browser
   selbst durchgehen, mit der Änderung interagieren und die Konsole auf neue Fehler
   prüfen. Fehlende Zugänge oder Testdaten sofort melden. Ohne UI-Änderung den
   Browsercheck als nicht anwendbar kennzeichnen.
4. Kurz berichten: Gate-Ergebnisse, ausgeführte Browserinteraktionen samt Ergebnis
   und offene Acceptance-Punkte. Erfolgreiche Logs nicht vollständig ausgeben.
   Eine ausdrücklich verlangte Nutzerabnahme getrennt als offen ausweisen.

Keine ungeprüfte Checkbox abhaken und keinen fehlerhaften Check überspringen.
Nach 2–3 Fehlversuchen am selben Problem stoppen. Änderungen an Domain-Erwartungen
begründen und bei einer Regeländerung vorab die Zustimmung des Nutzers einholen.
