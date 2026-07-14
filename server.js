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
    const { pin, baseName, count } = req.body;
    const botCount = parseInt(count);

    console.log(`Starting web raid: ${botCount} bots heading to PIN ${pin}`);

    for (let i = 1; i <= botCount; i++) {
        setTimeout(() => {
            const client = new Kahoot();
            const botName = `${baseName}_${i}`;
            
            client.join(pin, botName).then(() => {
                console.log(`[${botName}] Joined via Web UI`);
            }).catch(err => {
                console.log(`[${botName}] Join Error:`, err.description || err);
            });

            client.on("QuestionStart", (question) => {
                const choicesCount = question.quizQuestionAnswers[question.questionIndex];
                const randomChoice = Math.floor(Math.random() * choicesCount);
                
                setTimeout(() => {
                    question.answer(randomChoice);
                    console.log(`[${botName}] Answered choice ${randomChoice + 1}`);
                }, Math.floor(Math.random() * 200) + 100);
            });
            
        }, i * 50);
    }

    res.json({ status: "success", message: `${botCount} bots deployed successfully!` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
