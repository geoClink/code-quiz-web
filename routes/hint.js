const router = require('express').Router()
const { getHint } = require('../services/groq')

router.post('/', async (req, res) => {
    const groqKey = req.headers['x-groq-key']
    const { question, code } = req.body

    if (!groqKey) {
        return res.status(401).json({ error: 'Groq API key required' })
    }

    try {
        const hint = await getHint(groqKey, question, code)
        res.json({ hint })
    } catch (err) {
        res.status(500).json({ error: 'Failed to get hint', details: err.message })
    }
})

module.exports = router