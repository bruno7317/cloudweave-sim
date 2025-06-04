import { Router } from 'express'
import Country from '../models/Country'
import Market from '../models/Market'
import TurnManager from '../models/TurnManager'

const router = Router()

const market = new Market({})

const canada = new Country({
    name: 'Canada',
    stockpile: 10,
    money_reserves: 100,
    production_rate: 3,
    consumption_rate: 1
})

const usa = new Country({
    name: 'USA',
    stockpile: 2,
    money_reserves: 100,
    production_rate: 1,
    consumption_rate: 4
})
const turnManager = new TurnManager([canada, usa], market)

router.get('/', async (req, res) => {

    turnManager.performTurn()

    res.send(JSON.stringify(market.offers, null, 2))
})

module.exports = router