const router = require('express').Router()
const fs = require('fs')
const path = require('path')

const SESSIONS_DIR = path.join(__dirname, '../sessions')

router.post('/', (req, res) => {
    const { session } = req.body

    if (!session) {
        return res.status(400).json({ error: 'Session data required' })
    }

    try {
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR)
        }

        const filename = `${session.repo}_${Date.now()}.json`
        const filepath = path.join(SESSIONS_DIR, filename)
        fs.writeFileSync(filepath, JSON.stringify(session, null, 2))
        res.json({ saved: true, filename })
    } catch (err) {
        res.status(500).json({ error: 'Failed to save session', details: err.message })
    }
})

router.get('/:repo', (req, res) => {
    const { repo } = req.params

    try {
        if (!fs.existsSync(SESSIONS_DIR)) {
            return res.json({ sessions: [] })
        }

        const files = fs.readdirSync(SESSIONS_DIR)
            .filter(f => f.startsWith(repo) && f.endsWith('.json'))

        const sessions = files.map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'))
            return data
        })

        res.json({ sessions })
    } catch (err) {
        res.status(500).json({ error: 'Failed to load sessions', details: err.message })
    }
})

module.exports = router