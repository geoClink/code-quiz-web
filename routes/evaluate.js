const router = require('express').Router()
const { evaluateAnswer } = require('../services/groq')

router.post('/', async (req, res) => {
    const groqKey = req.headers['x-groq-key']
    const { question, answer, code, repo } = req.body

    if (!groqKey) {
        return res.status(401).json({ error: 'Groq API key required' })
    }

    try {
        const feedback = await evaluateAnswer(groqKey, question, answer, code, repo)
        const lines = feedback.trim().split('\n')
        const lastLine = lines[lines.length - 1].trim().toUpperCase()
        let result = 'correct'
        if (lastLine.includes('INCORRECT')) result = 'incorrect'
        else if (lastLine.includes('PARTIAL')) result = 'partial'
        res.json({ feedback, result })
    } catch (err) {
        res.status(500).json({ error: 'Failed to evaluate answer', details: err.message })
    }
})

module.exports = router