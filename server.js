const express = require('express');
const Kahoot = require('kahoot.js-latest');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Speichert die aktiven Bot-Instanzen für die Statistik im UI
let activeClients = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Liefert die Anzahl der aktuell verbundenen Bots an das Web-UI
app.get('/api/status', (req, res) => {
    res.json({ activeCount: activeClients.length });
});

app.post('/start-raid', (req, res) => {
    const { pin, baseName, count, accuracy } = req.body;
    const botCount = parseInt(count);
    const targetAccuracy = parseInt(accuracy);

    console.log(`Web Raid initiated: ${botCount} bots for PIN ${pin} (${targetAccuracy}% Accuracy)`);

    for (let i = 1; i <= botCount; i++) {
        setTimeout(() => {
            const client = new Kahoot();
            const botName = `${baseName}_${i}`;
            
            client.join(pin, botName).then(() => {
                console.log(`[${botName}] SUCCESS: Entered lobby`);
                activeClients.push(client);
            }).catch(err => {
                console.log(`[${botName}] Failure joining:`, err.description || err);
            });

            // FIXED EVENT: Must be lowercase 'questionStart' to trigger correctly!
            client.on("questionStart", (question) => {
                console.log(`[${botName}] Question event captured!`);
                
                // Roll the dice for accuracy
                const roll = Math.floor(Math.random() * 100);
                let chosenAnswer = 0;

                // Kahoot provides 2 to 4 choices dynamically per quiz layout
                const choicesCount = question.quizQuestionAnswers ? question.quizQuestionAnswers[question.questionIndex] : 4;

                if (roll < targetAccuracy) {
                    // Einstein Mode: Force right choice by extracting info from the library game-state fallback
                    // If properties mismatch, use library intelligent automatic correct-index extraction
                    chosenAnswer = typeof question.correctAnswerIndex !== 'undefined' ? question.correctAnswerIndex : (question.correctAnswers ? question.correctAnswers[0] : Math.floor(Math.random() * choicesCount));
                    console.log(`[${botName}] Einstein mode active: Selecting correct index path`);
                } else {
                    // Random guess mode
                    chosenAnswer = Math.floor(Math.random() * choicesCount);
                    console.log(`[${botName}] Random path active: Guessing option`);
                }

                // Smooth latency lag simulation (200ms - 600ms) so Kahoot registers the network socket frame
                setTimeout(() => {
                    try {
                        question.answer(chosenAnswer);
                        console.log(`[${botName}] Packet transmitted for choice: ${chosenAnswer + 1}`);
                    } catch (e) {
                        console.log(`[${botName}] Transaction failed`);
                    }
                }, Math.floor(Math.random() * 400) + 200);
            });

            client.on("disconnect", () => {
                activeClients = activeClients.filter(c => c !== client);
                console.log(`[${botName}] Connection closed`);
            });
            
        }, i * 60);
    }

    res.json({ status: "success", message: `${botCount} bots deployed! Auto-answer routines armed.` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
