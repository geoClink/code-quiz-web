require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/api/repos', require('./routes/repos'))
app.use('/api/quiz', require('./routes/quiz'))
app.use('/api/evaluate', require('./routes/evaluate'))
app.use('/api/hint', require('./routes/hint'))
app.use('api/explain', require('./routes/explain'))
app.use('api/sessions', require('./routes/sessions'))
app.use('api/git-quiz', require('./routes/git-quiz'))
app.use('api/ai-quiz', require('./routes/ai-quiz'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))

