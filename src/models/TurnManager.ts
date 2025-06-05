import logger from "../logger";
import Country from "./Country";
import Market from "./Market";
import TradeOffer from "./TradeOffer";

class TurnManager {
    private _turn = 0;

    constructor(
        private countries: Country[],
        private market: Market
    ) {}

    get turn(): number {
        return this._turn;
    }

    getCountry(name: string): Country {
        const found = this.countries.find(c => c.name === name);
        if (!found) throw new Error(`[TURN] Country ${name} not found.`);
        return found;
    }

    processTrade(offer: TradeOffer): void {
        if (!offer.isReadyToProcess()) {
            logger.error(`[TURN] Trade Offer isn't ready to be processed.`)
            return;
        }
        
        const seller = this.getCountry(offer.seller!);
        const buyer = this.getCountry(offer.buyer!);

        logger.info(`[TRADE_PROCESS] ${buyer.name} buys ${offer.quantity} units @ ${offer.unit_price} each from ${seller.name} (total: ${offer.totalCost})`);

        seller.withdrawResource(offer.quantity);
        buyer.withdrawMoney(offer.totalCost);
        seller.depositMoney(offer.totalCost);
        buyer.depositResource(offer.quantity);
    }

    performTurn(): void {
        this._turn++;
        logger.debug(`[TURN] Starting turn #${this._turn}`)
        this.market.removeExpiredOffers(this._turn);
        
        for (const country of this.countries) {
            const base_price = this.market.getBasePrice([...this.countries]);
            country.produce();
            country.consume();
            const offers = country.strategizeTrade(
                this.market.offers,
                base_price
            );

            const fulfilled: TradeOffer[] = []
            for (const offer of offers) {
                offer.createdAt = this._turn;
                if (offer.isReadyToProcess()) {
                    this.processTrade(offer);
                    fulfilled.push(offer)
                } else {
                    this.market.addOffer(offer);
                }
            }
            this.market.removeOffers(fulfilled);
        }

        logger.debug(`[TURN] End of turn #${this._turn}`)
    }
}

export default TurnManager