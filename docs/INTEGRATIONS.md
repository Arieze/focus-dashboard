# Intégrations locales

## foobar2000

Installez foobar2000 x64 dans son emplacement standard, puis le composant [Beefweb](https://github.com/hyperblast/beefweb). Configurez Beefweb pour écouter uniquement sur la boucle locale au port 8880, avec l'accès distant désactivé. L'API attendue est http://127.0.0.1:8880/api.

Le dashboard lit les playlists et leurs tags pour afficher artistes, albums et titres. Il contrôle la lecture et tente de démarrer foobar2000 avec /hide. Une authentification Beefweb n'est pas implémentée.

## Mesures PC

CPU, RAM et ping sont lus via Windows. Le ping utilise 8.8.8.8.

Les températures nécessitent Libre Hardware Monitor avec ses capteurs et son serveur local sur http://127.0.0.1:8085/data.json. Configurez son accès uniquement sur la boucle locale. Installez les pilotes requis par votre version du moniteur.

Le démarrage du moniteur cherche `%ProgramFiles%/LibreHardwareMonitor/LibreHardwareMonitor.exe`. Pour une installation différente, définissez la variable d'environnement `FOCUS_HARDWARE_MONITOR` avec le chemin complet de l'exécutable. Windows peut demander une élévation au lancement.

## Services en ligne

La météo utilise Open-Meteo avec une ville choisie manuellement. Les cours utilisent Yahoo Finance. Aucun compte ni secret n'est inclus dans le projet. Les données peuvent être indisponibles ou différées.
