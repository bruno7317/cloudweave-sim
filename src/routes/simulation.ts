import { Router } from 'express'
import Country from '../models/Country'
import TradeType from '../models/TradeType'
import Market from '../models/Market'

const router = Router()

function performTurn(countries: Country[], market: Market): void {
    for (const country of countries) {
        country.produce()
        country.consume()
        const offer = country.strategizeTrade();
        if (offer) {
            market.addOffer(offer);
        }
    }
}

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

router.get('/', async (req, res) => {

    performTurn([canada, usa], market)

    res.send(`${JSON.stringify(canada)}, ${JSON.stringify(usa)}`)
})

router.get('/consume', async (req,res) => {
    canada.consume()
    res.send(`${JSON.stringify(canada)}`)
})

router.get('/produce', async (req,res) => {
    canada.produce()
    res.send(`${JSON.stringify(canada)}`)
})

module.exports = router