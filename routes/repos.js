const router = require('express').Router()
const { fetchRepos } = require('../services/github')

router.get('/', async (req, res) => {
    const token = req.headers['x-github-token']

    if (!token) {
        return res.status(401).json({ error: 'GitHub token required' })
    }

    try {
        const repos = await fetchRepos(token)
        res.json({ repos })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch repos', details: err.message })
    }
})

router.get('/files/:owner/:repo', async (req, res) => {
    const token = req.headers['x-github-token']
    const { owner, repo } = req.params

    if (!token) {
        return res.status(401).json({ error: 'GitHub token required' })
    }

    try {
        const { fetchFiles } = require('../services/github')
        const files = await fetchFiles(token, owner, repo)
        res.json({ files })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch files', details: err.message })
    }
})

module.exports = router