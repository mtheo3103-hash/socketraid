const express = require('express');
const Kahoot = require('kahoot.js-latest');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let activeClients = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ activeCount: activeClients.length });
});

app.post('/start-raid', (req, res) => {
    const { pin, baseName, count, accuracy } = req.body;
    const botCount = parseInt(count);
    const targetAccuracy = parseInt(accuracy);

    console.log(`Raid started: ${botCount} bots for PIN ${pin}`);

    for (let i = 1; i <= botCount; i++) {
        setTimeout(() => {
            const client = new Kahoot();
            const botName = `${baseName}_${i}`;
            
            client.join(pin, botName).then(() => {
                console.log(`[${botName}] SUCCESS: In lobby`);
                activeClients.push(client);
            }).catch(err => {
                console.log(`[${botName}] Join Error:`, err.description || err);
            });

            // FALLBACK ENGINE: We register multiple event formats to ensure it catches Kahoot's signal
            const handleQuestion = (question) => {
                console.log(`[${botName}] Question detected! Processing answer calculation...`);
                
                // Determine layout size (True/False vs Quiz)
                const choicesCount = question.quizQuestionAnswers ? question.quizQuestionAnswers[question.questionIndex] : 4;
                
                // Probability calculation
                const roll = Math.floor(Math.random() * 100);
                let chosenAnswer = 0;

                // Check if Einstein mode or Random mode applies
                if (roll < targetAccuracy && typeof question.correctAnswerIndex !== 'undefined') {
                    chosenAnswer = question.correctAnswerIndex;
                    console.log(`[${botName}] Submitting correct index`);
                } else {
                    chosenAnswer = Math.floor(Math.random() * choicesCount);
                    console.log(`[${botName}] Submitting random guess`);
                }

                // Stagger delay (200ms - 800ms) to ensure Kahoot's anti-spam pipeline registers the click
                setTimeout(() => {
                    try {
                        // Crucial library call execution
                        question.answer(chosenAnswer);
                        console.log(`[${botName}] Packet sent for choice ${chosenAnswer + 1}`);
                    } catch (e) {
                        console.log(`[${botName}] Execution block failed: ${e.message}`);
                    }
                }, Math.floor(Math.random() * 600) + 200);
            };

            // Registering all 3 known formats used by the library across updates
            client.on("QuestionStart", handleQuestion);
            client.on("questionStart", handleQuestion);
            client.on("quizUpdate", handleQuestion);

            client.on("disconnect", () => {
                activeClients = activeClients.filter(c => c !== client);
                console.log(`[${botName}] Left session`);
            });
            
        }, i * 60);
    }

    res.json({ status: "success", message: `${botCount} bots deployed! Auto-answer pipeline active.` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
