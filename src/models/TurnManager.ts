import logger from "../logger";
import Country from "./Country";
import { EventInput } from "./EventInput";
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

    processTrade(offer: TradeOffer): EventInput {
        const seller = this.getCountry(offer.seller!);
        const buyer = this.getCountry(offer.buyer!);

        seller.withdrawResource(offer.quantity);
        buyer.withdrawMoney(offer.totalCost);
        seller.depositMoney(offer.totalCost);
        buyer.depositResource(offer.quantity);
        return {
            turn: this._turn,
            actor: buyer.name,
            action: `buy from ${seller.name}`,
            resource: offer.resource,
            quantity: offer.quantity
        }
    }

    countriesProduce(countries: Country[]): EventInput[] {
        const events: EventInput[] = [];
        for (const country of countries) {
            const result = country.produce();
            events.push({
                turn: this._turn,
                actor: country.name,
                action: 'produce',
                resource: result.resource,
                quantity: result.amount
            })
        }
        return events
    }

    countriesConsume(countries: Country[]): EventInput[] {
        const events: EventInput[] = [];
        for (const country of countries) {
            const result = country.consume();
            events.push({
                turn: this._turn,
                actor: country.name,
                action: 'consume',
                resource: result.resource,
                quantity: result.amount
            })
        }
        return events;
    }

    countriesTrade(countries: Country[]): EventInput[] {
        const events: EventInput[] = [];

        const base_price = this.market.getBasePrice([...countries]);

        for (const country of countries) {
            const offers = country.strategizeTrade(this.market.offers, base_price);

            const fulfilled: TradeOffer[] = []
            for (const offer of offers) {
                offer.createdAt = this._turn;
                if (offer.isReadyToProcess()) {
                    const trade_event = this.processTrade(offer);
                    events.push(trade_event)
                    fulfilled.push(offer)
                } else {
                    this.market.addOffer(offer);
                }
            }
            this.market.removeOffers(fulfilled);
        }

        return events;
    }

    performTurn(): EventInput[] {
        this._turn++;
        const events: EventInput[] = []
        logger.debug(`[TURN] Starting turn #${this._turn}`)
        this.market.removeExpiredOffers(this._turn);
        
        events.push(...this.countriesProduce(this.countries))

        events.push(...this.countriesConsume(this.countries))

        events.push(...this.countriesTrade(this.countries))

        logger.debug(`[TURN] End of turn #${this._turn}`)

        return events;
    }
}

export default TurnManager