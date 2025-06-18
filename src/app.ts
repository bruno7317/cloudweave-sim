import express from 'express'
import cors from 'cors'
import simulationRoute from './routes/simulation'

const app = express()
app.use(cors({origin: '*'}))
app.use('/simulation', simulationRoute)
const port = 8100

app.listen(port, () => {
    console.log(`listening on http://localhost:${port}`)
})