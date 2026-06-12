const Groq = require('groq-sdk')

function getClient(apiKey) {
    return new Groq({ apiKey })
}

async function generateQuestion(apiKey, code, repoName, difficulty, topic, history) {
    const client = getClient(apiKey)

    const difficultyMap = {
        beginner: 'Ask beginner-friendly questions focused on what code does and how it works.',
        intermediate: 'Ask intermediate questions focused on why decisions were made and what patterns are being used.',
        advanced: 'Ask advanced questions focused on tradeoffs, what would break if something changed, and architecture decisions.'
    }

    const topicInstruction = topic ? `Focus specifically on ${topic} in the code.` : ''
    const historyNote = history?.length
        ? 'Do not repeat these previously asked questions:\n' + history.map(q => `- ${q}`).join('\n')
        : ''

    const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a senior developer quizzing a junior developer on their own code. Ask one conceptual question at a time. Never ask about specific line numbers. Keep questions clear and concise. Never repeat a previous question. ${difficultyMap[difficulty] || difficultyMap.intermediate} ${topicInstruction} ${historyNote}`
            },
            {
                role: 'user',
                content: `Here is code from a GitHub repo called ${repoName}:\n\n${code.slice(0, 40000)}\n\nAsk me one quiz question about this code.`
            }
        ]
    })

    return response.choices[0].message.content
}

async function evaluateAnswer(apiKey, question, answer, code, repoName) {
    const client = getClient(apiKey)

    const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: 'You are a senior developer evaluating a junior developer\'s answer. Be encouraging but honest. Tell them what they got right, what they missed, and give the full explanation. End your response with exactly one word on the last line: CORRECT, PARTIAL, or INCORRECT.'
            },
            {
                role: 'user',
                content: `Code from repo ${repoName}:\n\n${code.slice(0, 40000)}\n\nQuestion: ${question}\n\nDeveloper answer: ${answer}\n\nEvaluate this answer.`
            }
        ]
    })

    return response.choices[0].message.content
}

async function getHint(apiKey, question, code) {
    const client = getClient(apiKey)

    const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'Give a helpful hint without revealing the full answer. Just a nudge in the right direction.' },
            { role: 'user', content: `Code:\n\n${code.slice(0, 20000)}\n\nQuestion: ${question}\n\nGive me a hint.` }
        ]
    })

    return response.choices[0].message.content
}

async function getExplanation(apiKey, question, answer, feedback) {
    const client = getClient(apiKey)

    const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: 'Explain this concept in plain English with a simple example. Assume the developer is still learning.' },
            { role: 'user', content: `Question: ${question}\n\nAnswer given: ${answer}\n\nFeedback: ${feedback}\n\nGive me a deeper explanation.` }
        ]
    })

    return response.choices[0].message.content
}

module.exports = { generateQuestion, evaluateAnswer, getHint, getExplanation }