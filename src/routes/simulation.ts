import { Router } from 'express'
import Country from '../models/Country'
import TradeType from '../models/TradeType'

const router = Router()

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
    const sell_offer = canada.createTradeOffer({
        trade_type: TradeType.Sell,
        quantity: 10,
        unit_price: 2
    })

    sell_offer.accept(usa)

    sell_offer.process()

    res.send(`
        Canada: ${JSON.stringify(canada)},
        USA: ${JSON.stringify(usa)}
    `)
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