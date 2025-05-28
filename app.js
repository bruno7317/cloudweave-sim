const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors({origin: '*'}))
const port = 8100

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})