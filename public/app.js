// State
const state = {
    githubToken: '',
    groqKey: '',
    owner: '',
    selectedRepo: null,
    selectedFile: null,
    files: [],
    difficulty: 'intermediate',
    topic: '',
    question: '',
    code: '',
    history: [],
    correct: 0,
    partial: 0,
    incorrect: 0,
    streak: 0,
    sessionQuestions: [],
    isDemo: false
}

// Screen management
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.getElementById(id).classList.add('active')
    window.scrollTo(0, 0)
}

// API helper
async function api(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'x-github-token': state.githubToken,
        'x-groq-key': state.groqKey
    }
    const options = { method, headers }
    if (body) options.body = JSON.stringify(body)
    const res = await fetch(endpoint, options)
    return res.json()
}

// Load keys from localStorage
function loadKeys() {
    state.githubToken = localStorage.getItem('github-token') || ''
    state.groqKey = localStorage.getItem('groq-key') || ''
    if (state.githubToken) document.getElementById('github-token').value = state.githubToken
    if (state.groqKey) document.getElementById('groq-key').value = state.groqKey
}

// Setup screen
document.getElementById('btn-connect').addEventListener('click', async () => {
    const token = document.getElementById('github-token').value.trim()
    const groqKey = document.getElementById('groq-key').value.trim()
    const errorEl = document.getElementById('connect-error')

    if (!token || !groqKey) {
        errorEl.textContent = 'Both keys are required.'
        errorEl.classList.remove('hidden')
        return
    }

    state.githubToken = token
    state.groqKey = groqKey

    errorEl.classList.add('hidden')
    document.getElementById('btn-connect').textContent = 'Connecting...'

    const result = await api('/api/repos')

    if (result.error) {
        errorEl.textContent = result.error
        errorEl.classList.remove('hidden')
        document.getElementById('btn-connect').textContent = 'Connect'
        return
    }

    localStorage.setItem('github-token', token)
    localStorage.setItem('groq-key', groqKey)

    state.owner = result.repos[0]?.name ? await getOwner() : ''
    renderRepos(result.repos)
    showScreen('screen-repos')
    document.getElementById('btn-connect').textContent = 'Connect'
})

async function getOwner() {
    const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${state.githubToken}` }
    })
    const data = await res.json()
    return data.login
}

// Demo mode
document.getElementById('btn-demo').addEventListener('click', () => {
    state.isDemo = true
    state.githubToken = 'demo'
    state.groqKey = localStorage.getItem('groq-key') || ''

    if (!state.groqKey) {
        const key = prompt('Enter your Groq API key to use demo mode:')
        if (!key) return
        state.groqKey = key
        localStorage.setItem('groq-key', key)
    }

    state.selectedRepo = 'the-bakery-co'
    state.owner = 'geoClink'
    loadQuizSettings()
    showScreen('screen-settings')
})

// Repo list
function renderRepos(repos) {
    const list = document.getElementById('repo-list')
    list.innerHTML = ''
    repos.forEach(repo => {
        const item = document.createElement('div')
        item.className = 'repo-item'
        item.innerHTML = `
            <span class="repo-name">${repo.name}</span>
            <span class="repo-language">${repo.language || ''}</span>
        `
        item.addEventListener('click', () => selectRepo(repo.name))
        list.appendChild(item)
    })
}

document.getElementById('repo-search').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase()
    const result = await api('/api/repos')
    if (result.repos) {
        const filtered = result.repos.filter(r => r.name.toLowerCase().includes(query))
        renderRepos(filtered)
    }
})

async function selectRepo(repoName) {
    state.selectedRepo = repoName
    await loadQuizSettings()
    showScreen('screen-settings')
}

// Settings screen
async function loadQuizSettings() {
    document.getElementById('settings-repo-name').textContent = state.selectedRepo

    if (!state.isDemo) {
        const result = await api(`/api/repos/files/${state.owner}/${state.selectedRepo}`)
        state.files = result.files || []
    } else {
        const result = await api(`/api/repos/files/geoClink/the-bakery-co`)
        state.files = result.files || []
    }

    const picker = document.getElementById('file-picker')
    picker.innerHTML = '<option value="">All files</option>'
    state.files.forEach(f => {
        const opt = document.createElement('option')
        opt.value = f.path
        opt.textContent = f.path
        picker.appendChild(opt)
    })
}

document.getElementById('btn-back-setup').addEventListener('click', () => showScreen('screen-setup'))
document.getElementById('btn-back-repos').addEventListener('click', () => showScreen('screen-repos'))

document.getElementById('btn-start-quiz').addEventListener('click', async () => {
    state.difficulty = document.getElementById('difficulty').value
    state.topic = document.getElementById('topic').value
    state.selectedFile = document.getElementById('file-picker').value
    state.history = []
    state.correct = 0
    state.partial = 0
    state.incorrect = 0
    state.streak = 0
    state.sessionQuestions = []

    updateScoreDisplay()
    showScreen('screen-quiz')

    if (state.isDemo) {
        document.getElementById('demo-banner').classList.remove('hidden')
    }

    await loadNextQuestion()
})

// Quiz screen
async function loadNextQuestion() {
    document.getElementById('question-text').textContent = 'Generating question...'
    document.getElementById('answer-input').value = ''
    document.getElementById('hint-panel').classList.add('hidden')
    document.getElementById('feedback-panel').classList.add('hidden')
    document.getElementById('explain-panel').classList.add('hidden')
    document.getElementById('post-feedback-actions').classList.add('hidden')

    const result = await api('/api/quiz', 'POST', {
        owner: state.isDemo ? 'geoClink' : state.owner,
        repo: state.selectedRepo,
        filePath: state.selectedFile,
        difficulty: state.difficulty,
        topic: state.topic,
        history: state.history
    })

    if (result.error) {
        document.getElementById('question-text').textContent = 'Failed to generate question. Try again.'
        return
    }

    state.question = result.question
    state.history.push(result.question)
    document.getElementById('question-text').textContent = result.question
}

document.getElementById('btn-submit').addEventListener('click', async () => {
    const answer = document.getElementById('answer-input').value.trim()
    if (!answer) return

    document.getElementById('btn-submit').textContent = 'Evaluating...'

    const codeContext = state.files
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n')
        .slice(0, 40000)

    const result = await api('/api/evaluate', 'POST', {
        question: state.question,
        answer,
        code: codeContext,
        repo: state.selectedRepo
    })

    document.getElementById('btn-submit').textContent = 'Submit'

    if (result.error) return

    const feedbackPanel = document.getElementById('feedback-panel')
    const feedbackText = document.getElementById('feedback-text')
    const resultBadge = document.getElementById('result-badge')

    feedbackText.textContent = result.feedback
    resultBadge.textContent = result.result
    resultBadge.className = `result-badge ${result.result}`
    feedbackPanel.classList.remove('hidden')

    if (result.result === 'correct') {
        state.correct++
        state.streak++
        if (state.streak >= 3) {
            document.getElementById('streak-count').textContent = `${state.streak} 🔥`
        }
    } else if (result.result === 'partial') {
        state.partial++
        state.streak = 0
    } else {
        state.incorrect++
        state.streak = 0
    }

    state.sessionQuestions.push({
        question: state.question,
        answer,
        result: result.result
    })

    updateScoreDisplay()
    document.getElementById('post-feedback-actions').classList.remove('hidden')

    if (result.result === 'correct') {
        document.getElementById('btn-retry').classList.add('hidden')
        document.getElementById('btn-next').classList.remove('hidden')
    } else {
        document.getElementById('btn-retry').classList.remove('hidden')
        document.getElementById('btn-next').classList.remove('hidden')
    }
})

document.getElementById('btn-hint').addEventListener('click', async () => {
    document.getElementById('btn-hint').textContent = 'Loading...'

    const codeContext = state.files
        .map(f => `--- ${f.path} ---\n${f.content}`)
        .join('\n\n')
        .slice(0, 20000)

    const result = await api('/api/hint', 'POST', {
        question: state.question,
        code: codeContext
    })

    document.getElementById('btn-hint').textContent = 'Hint'

    if (result.hint) {
        document.getElementById('hint-text').textContent = result.hint
        document.getElementById('hint-panel').classList.remove('hidden')
    }
})

document.getElementById('btn-flag').addEventListener('click', () => {
    state.sessionQuestions.push({
        question: state.question,
        result: 'flagged'
    })
    loadNextQuestion()
})

document.getElementById('btn-explain').addEventListener('click', async () => {
    document.getElementById('btn-explain').textContent = 'Loading...'

    const result = await api('/api/explain', 'POST', {
        question: state.question,
        answer: document.getElementById('answer-input').value,
        feedback: document.getElementById('feedback-text').textContent
    })

    document.getElementById('btn-explain').textContent = 'Explain further'

    if (result.explanation) {
        document.getElementById('explain-text').textContent = result.explanation
        document.getElementById('explain-panel').classList.remove('hidden')
    }
})

document.getElementById('btn-next').addEventListener('click', () => loadNextQuestion())

document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('answer-input').value = ''
    document.getElementById('feedback-panel').classList.add('hidden')
    document.getElementById('explain-panel').classList.add('hidden')
    document.getElementById('post-feedback-actions').classList.add('hidden')
})

document.getElementById('btn-end').addEventListener('click', () => showSummary())

function updateScoreDisplay() {
    document.getElementById('count-correct').textContent = state.correct
    document.getElementById('count-partial').textContent = state.partial
    document.getElementById('count-incorrect').textContent = state.incorrect
    document.getElementById('streak-count').textContent = state.streak
}

// Summary screen
function showSummary() {
    document.getElementById('summary-correct').textContent = state.correct
    document.getElementById('summary-partial').textContent = state.partial
    document.getElementById('summary-incorrect').textContent = state.incorrect
    document.getElementById('summary-streak').textContent = state.streak

    const questionsEl = document.getElementById('summary-questions')
    questionsEl.innerHTML = ''
    state.sessionQuestions.forEach(q => {
        const item = document.createElement('div')
        item.className = 'summary-question-item'
        item.innerHTML = `
            <span>${q.question}</span>
            <span class="result-badge ${q.result}">${q.result}</span>
        `
        questionsEl.appendChild(item)
    })

    showScreen('screen-summary')
}

document.getElementById('btn-save-session').addEventListener('click', async () => {
    const session = {
        repo: state.selectedRepo,
        date: new Date().toISOString(),
        difficulty: state.difficulty,
        topic: state.topic || 'any',
        questions: state.sessionQuestions,
        summary: {
            correct: state.correct,
            partial: state.partial,
            incorrect: state.incorrect,
            streak: state.streak
        }
    }

    const result = await api('/api/sessions', 'POST', { session })
    if (result.saved) {
        document.getElementById('btn-save-session').textContent = 'Saved!'
    }
})

document.getElementById('btn-new-session').addEventListener('click', () => {
    state.isDemo = false
    showScreen('screen-repos')
})

// Init
loadKeys()