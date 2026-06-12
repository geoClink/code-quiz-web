const { Octokit } = require('@octokit/rest')

function getClient(token) {
    return new Octokit({ auth: token })
}

async function fetchRepos(token) {
    const octokit = getClient(token)
    const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
    })

    return data.map(repo => ({
        name: repo.name,
        private: repo.private,
        language: repo.language,
        update_at: repo.updated_at
    }))
}

async function fetchFiles(token, owner, repo) {
    const octokit = getClient(token)
    const extensions = ['.py', '.js', '.swift', '.ts', '.html', '.css']
    const files = []

    async function scanDir(path) {
        const { data } = await octokit.repos.getContent({ owner, repo, path })
        for (const item of data) {
            if (item.type === 'dir') {
                await scanDir(item.path)
            } else if (extensions.some(ext => item.name.endsWith(ext))) {
                const { data: file } =await octokit.repos.getContent({ owner, repo, path: item.path })
                const content = Buffer.from(file.content, 'base64').toString('utf-8')
                files.push({ path: item.path, content })
            }
        }
    }

    await scanDir('')
    return files
}

module.exports = { fetchRepos, fetchFiles }