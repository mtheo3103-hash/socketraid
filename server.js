const express = require('express');
const Kahoot = require('kahoot.js-latest');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/start-raid', (req, res) => {
    const { pin, baseName, count, accuracy } = req.body;
    const botCount = parseInt(count);
    const targetAccuracy = parseInt(accuracy); // Erfolgsquote in % (0 - 100)

    console.log(`Starting web raid: ${botCount} bots heading to PIN ${pin} with ${targetAccuracy}% accuracy`);

    for (let i = 1; i <= botCount; i++) {
        setTimeout(() => {
            const client = new Kahoot();
            const botName = `${baseName}_${i}`;
            
            client.join(pin, botName).then(() => {
                console.log(`[${botName}] Joined via Web UI`);
            }).catch(err => {
                console.log(`[${botName}] Join Error:`, err.description || err);
            });

            // EINSTEIN RESPONSE LOGIC
            client.on("QuestionStart", (question) => {
                const choicesCount = question.quizQuestionAnswers[question.questionIndex];
                
                // kahoot.js-latest transmits the accurate correct index via the question event context
                // Fallback to 0 if the structure properties mismatch
                const correctAnswerIndex = question.correctAnswerIndex !== undefined ? question.correctAnswerIndex : 0;
                
                let chosenAnswer = correctAnswerIndex;
                
                // Roll the dice: check if this specific bot should answer correctly or guess wrong
                const roll = Math.floor(Math.random() * 100);
                if (roll >= targetAccuracy) {
                    // Answer incorrectly: pick a random index that is NOT the correct one
                    let wrongChoices = [];
                    for (let c = 0; c < choicesCount; c++) {
                        if (c !== correctAnswerIndex) wrongChoices.push(c);
                    }
                    // If wrong choices exist, pick one, otherwise fallback to random
                    chosenAnswer = wrongChoices.length > 0 ? wrongChoices[Math.floor(Math.random() * wrongChoices.length)] : Math.floor(Math.random() * choicesCount);
                }
                
                // Human-like response latency lag simulation (150ms - 450ms)
                setTimeout(() => {
                    try {
                        question.answer(chosenAnswer);
                        console.log(`[${botName}] Submitted choice ${chosenAnswer + 1} (Target Accuracy Mode)`);
                    } catch (e) {
                        console.log(`[${botName}] Answer failed execution`);
                    }
                }, Math.floor(Math.random() * 300) + 150);
            });
            
        }, i * 50);
    }

    res.json({ status: "success", message: `${botCount} bots deployed with ${targetAccuracy}% Einstein tracking!` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
