import logger from "../logger";
import Country from "./Country";
import TradeOffer from "./TradeOffer";
import TradeType from "./TradeType";

interface MarketOptions {
    // For now, empty — placeholder for future config like fee rates, max offers, etc.
}

class Market {
    private _offers: TradeOffer[] = [];

    constructor(options: MarketOptions) {
        logger.debug("[MARKET] Market initialized.");
    }

    addOffer(offer: TradeOffer): void {
        this._offers.push(offer);
        logger.debug(`[MARKET] New ${offer.type} offer added by ${offer.authorName}`);
    }

    getAvailableOffers(): TradeOffer[] {
        logger.debug(`[MARKET] Returning ${this._offers.length} current offers`);
        return this._offers;
    }

    matchOffers(): void {
        logger.debug("[MARKET] Attempting to match offers...");

        const buys = this._offers
            .filter(o => o.type === TradeType.Buy)
            .sort((a, b) => b.unit_price - a.unit_price); // highest price first

        const sells = this._offers
            .filter(o => o.type === TradeType.Sell)
            .sort((a, b) => a.unit_price - b.unit_price); // lowest price first

        for (let buy of buys) {
            for (let sell of sells) {
                if (buy.unit_price >= sell.unit_price && buy.quantity > 0 && sell.quantity > 0) {
                    const quantityTraded = Math.min(buy.quantity, sell.quantity);

                    logger.debug(`[MARKET] Matched ${quantityTraded} units between ${buy.authorName} (BUY) and ${sell.authorName} (SELL) at price ${sell.unit_price}`);

                    buy.quantity -= quantityTraded;
                    sell.quantity -= quantityTraded;

                    if (buy.quantity === 0) break; // move to next buyer
                }
            }
        }

        // Remove filled offers
        this._offers = this._offers.filter(o => o.quantity > 0);

        logger.debug("[MARKET] Matchmaking complete.");
    }

    getBasePrice(countries: Country[]): number {
        let totalStockpile = 0;
        let totalMoney = 0;

        for (const country of countries) {
            totalStockpile += country.stockpile;
            totalMoney += country.money_reserves;
        }

        const rawPrice = (totalMoney / totalStockpile) * 2;
        const price = Math.max(rawPrice, 1); // Never drop below $1

        return price;
    }
}

export default Market;
