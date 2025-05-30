const express = require('express')
const cors = require('cors')
const simulationRoute = require('./routes/simulation')

const app = express()
app.use(cors({origin: '*'}))
app.use('/simulation', simulationRoute)
const port = 8100

app.listen(port, () => {
    console.log(`listening on http://localhost:${port}`)
})