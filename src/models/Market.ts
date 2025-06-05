import { off } from "process";
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
        if (offer.quantity <= 0) {
            logger.warn(`[MARKET] Rejected offer from ${offer.authorName}: quantity must be > 0`);
            return;
        }
        if (offer.unit_price <= 0) {
            logger.warn(`[MARKET] Rejected offer from ${offer.authorName}: price must be > 0`);
            return;
        }

        const initialLength = this._offers.length;
        this._offers = this._offers.filter(o => o.authorName !== offer.authorName || o.type !== offer.type)
        
        if (initialLength > this._offers.length) {
            logger.debug(`[MARKET] Replaced exiting ${offer.type} offer from ${offer.authorName}`)
        }
        this._offers.push(offer);
        logger.debug(`[MARKET] New ${offer.type} offer added by ${offer.authorName}`);
    }

    get offers(): TradeOffer[] {
        return this._offers;
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

        return Math.round(price);
    }

    removeExpiredOffers(currentTurn: number): void {
        const initialLength = this._offers.length;
        this._offers = this._offers.filter(o => !o.isExpired(currentTurn));
        const removed = initialLength - this._offers.length
        if (removed > 0) {
            logger.debug(`[MARKET] Removed ${removed} expired offers.`)
        }
    }

    removeOffers(offers: TradeOffer[]): void {
        const idsToRemove = new Set(offers.map(o => o.id));
        this._offers = this._offers.filter(o => !idsToRemove.has(o.id));
    }
}

export default Market;
