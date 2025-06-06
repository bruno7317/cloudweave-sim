import { Router } from 'express'
import Market from '../models/Market'
import TurnManager from '../models/TurnManager'
import getCountries from '../services/country'

const router = Router()

const market = new Market({})

let turnManager: TurnManager;

async function init() {
    const countries = await getCountries();
    turnManager = new TurnManager([...countries], market)
}

init();

router.get('/', async (req, res) => {

    if (!turnManager) await init();

    turnManager.performTurn()

    res.send(JSON.stringify(market.offers, null, 2))
})

module.exports = router