const express = require('express');
const Kahoot = require('kahoot.js-latest');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let activeClients = [];
let logClients = []; // Liste der verbundenen Browser-Fenster für das Terminal

// Hilfsfunktion: Sendet eine Nachricht in Echtzeit an alle verbundenen Web-Terminals
function broadcastLog(message, type = 'info') {
    logClients.forEach(client => {
        // SSE-Format verlangt "data: <nachricht>\n\n"
        client.write(`data: [${type}] ${message}\n\n`);
    });
}

// Statische Dateien servieren
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Der Echtzeit-Stream für dein macOS Terminal im Browser
app.get('/api/log-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Browser zur Liste hinzufügen
    logClients.push(res);

    // Initialen Log senden
    res.write(`data: [system] Verbindung zum Render-Server-Cluster erfolgreich hergestellt.\n\n`);

    // Verbindung trennen, falls der User den Tab schließt
    req.on('close', () => {
        logClients = logClients.filter(client => client !== res);
    });
});

app.get('/api/status', (req, res) => {
    res.json({ activeCount: activeClients.length });
});

app.post('/start-raid', (req, res) => {
    const { pin, baseName, count, accuracy, avatarMode, avatarTheme } = req.body;
    const botCount = parseInt(count);
    const targetAccuracy = accuracy ? parseInt(accuracy) : 50; 

    console.log(`Raid started: ${botCount} bots for PIN ${pin} (Avatar Mode: ${avatarMode})`);
    broadcastLog(`Spamming-Prozess gestartet für PIN: ${pin}`, 'system');

    for (let i = 1; i <= botCount; i++) {
        setTimeout(() => {
            const client = new Kahoot();
            const botName = `${baseName}_${i}`;
            
            // Kahoot benötigt ein exaktes "avatar"-Objekt mit spezifischen IDs für Kopf, Körper und Accessoires
            let avatarData = undefined;
            if (avatarMode === 'custom') {
                avatarData = {
                    avatar: {
                        type: "user", // Sagt Kahoot, dass es ein ausgewählter Charakter ist
                        // Die IDs müssen exakt zu Kahoots Asset-Datenbank passen:
                        head: 1, 
                        body: 1,
                        accessory: 0,
                        color: "green"
                    }
                };

                // Zuweisung der exakten Kahoot-Asset-IDs für deine Themes
                if (avatarTheme === 'robots') {
                    avatarData.avatar.head = 13; // Roboter-Kopf-ID
                    avatarData.avatar.body = 13; // Roboter-Körper-ID
                    avatarData.avatar.accessory = 4; // z.B. Antenne
                } else if (avatarTheme === 'monsters') {
                    avatarData.avatar.head = 8; // Alien/Monster-Kopf-ID
                    avatarData.avatar.body = 8;
                    avatarData.avatar.accessory = 3; 
                } else if (avatarTheme === 'astronauts') {
                    avatarData.avatar.head = 5; // Astronauten-Helm
                    avatarData.avatar.body = 5;
                    avatarData.avatar.accessory = 1;
                } else if (avatarTheme === 'party') {
                    avatarData.avatar.head = 10; // Party-Kopf (z.B. Katze mit Brille)
                    avatarData.avatar.body = 10;
                    avatarData.avatar.accessory = 9; // Party-Hut
                }
            }

            // WICHTIG: Die Library erwartet die Avatar-Metadaten verpackt in einem "options"-Objekt!
            const joinOptions = avatarData ? avatarData : {};

            client.join(pin, botName, joinOptions).then(() => {
                console.log(`[${botName}] SUCCESS: In lobby`);
                const skinMsg = avatarMode === 'custom' ? ` mit Style [${avatarTheme}]` : '';
                broadcastLog(`Bot ${botName} beigetreten${skinMsg}.`, 'info');
                activeClients.push(client);
            }).catch(err => {
                const errMsg = err.description || err;
                console.log(`[${botName}] Join Error:`, errMsg);
                broadcastLog(`Fehler bei ${botName}: ${errMsg}`, 'error');
            });

            // FALLBACK ENGINE
            const handleQuestion = (question) => {
                console.log(`[${botName}] Question detected! Processing answer calculation...`);
                broadcastLog(`[${botName}] Neue Frage erkannt. Berechne Antwort...`, 'info');
                
                const choicesCount = question.quizQuestionAnswers ? question.quizQuestionAnswers[question.questionIndex] : 4;
                const roll = Math.floor(Math.random() * 100);
                let chosenAnswer = 0;

                if (roll < targetAccuracy && typeof question.correctAnswerIndex !== 'undefined') {
                    chosenAnswer = question.correctAnswerIndex;
                    console.log(`[${botName}] Submitting correct index`);
                } else {
                    chosenAnswer = Math.floor(Math.random() * choicesCount);
                    console.log(`[${botName}] Submitting random guess`);
                }

                setTimeout(() => {
                    try {
                        question.answer(chosenAnswer);
                        console.log(`[${botName}] Packet sent for choice ${chosenAnswer + 1}`);
                        broadcastLog(`[${botName}] Antwort gesendet (Form ${chosenAnswer + 1})`, 'info');
                    } catch (e) {
                        console.log(`[${botName}] Execution block failed: ${e.message}`);
                        broadcastLog(`[${botName}] Fehler beim Antworten: ${e.message}`, 'error');
                    }
                }, Math.floor(Math.random() * 600) + 200);
            };

            client.on("QuestionStart", handleQuestion);
            client.on("questionStart", handleQuestion);
            client.on("quizUpdate", handleQuestion);

            client.on("disconnect", () => {
                activeClients = activeClients.filter(c => c !== client);
                console.log(`[${botName}] Left session`);
                broadcastLog(`Bot ${botName} hat die Verbindung getrennt.`, 'error');
            });
            
        }, i * 60);
    }

    res.json({ status: "success", message: `${botCount} Bots mit Custom-Setup entsendet!` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
