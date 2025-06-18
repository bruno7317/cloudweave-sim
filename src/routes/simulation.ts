import { Router } from 'express'
import Market from '../models/Market'
import TurnManager from '../models/TurnManager'
import getCountries from '../services/country'
import postEvents from '../services/event'
import logger from '../logger'

const router = Router()

const market = new Market({})
let turnManager: TurnManager;

async function init() {
    try {
        const countries = await getCountries();
        turnManager = new TurnManager([...countries], market)
        logger.info('[SIMULATION] Initialized turn manager successfully');
    } catch (error) {
        logger.error(`[SIMULATION] Failed to initialize: ${error}`);
    }
}

init();

router.get('/', async (req, res) => {
    try {
        if (!turnManager) await init();

        if (!turnManager) {
            res.status(500).send('Turn manager is not initialized');
            return;
        }

        const events = turnManager.performTurn(); 

        try {
            await postEvents(events);
        } catch (error) {
            logger.warn(`[EVENT_LOGGING] Failed to post events: ${error}`);
        }

        res.json(market.offers);

    } catch (error) {
        logger.error(`[SIMULATION_ROUTE] Unexpected error: ${error}`);
        res.status(500).send('An error occurred while processing the turn');
    }
});

export default router