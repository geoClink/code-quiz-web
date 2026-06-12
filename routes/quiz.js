const router = require('express').Router()
const { fetchFiles } = require('../services/github')
const { generateQuestion } = require('../services/groq')

router.post('/', async (req, res) => {
    const token = req.headers['x-github-token']
    const groqKey = req.headers['x-groq-key']
    const { owner, repo, filePath, difficulty, topic, history } = req.body

    if (!token || !groqKey) {
        return res.status(401).json({ error: 'Github token and Groq API key are required' })
    }

    try {
        const files = await fetchFiles(token, owner, repo)
         
        let code
        if (filePath) {
            const file = files.find(f => f.path === filePath)
            code = file ? `--- ${file.path} ---\n${file.content}` : files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
        } else {
            code = files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
        }

        const question = await generateQuestion(groqKey, code, repo, difficulty || 'intermediate', topic, history || [])
        res.json({ question, fileCount: files.length })
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate questions', details: err.message })
    }
})

module.exports = router