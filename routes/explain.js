const router = require('express').Router()
const { getExplanation } = require('../services/groq')

router.post('/', async (req, res) => {
    const groqKey = req.headers['x-groq-key']
    const { question, answer, feedback } = req.body

    if (!groqKey) {
        return res.status(401).json({ error: 'Groq API key required' })
    }

    try {
        const explanation = await getExplanation(groqKey, question, answer, feedback)
        res.json({ explanation })
    } catch (err) {
        res.status(500).json({ error: 'Failed to get explanation', details: err.message })
    }
})

module.exports = router