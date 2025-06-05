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

        logger.debug(`[PRICE_CALC] --- Calculating base price ---`);
        for (const country of countries) {
            const effectiveMoney = Math.max(country.money_reserves, 0);
            logger.debug(`[PRICE_CALC] ${country.name}: stockpile=${country.stockpile}, money=${country.money_reserves}, effectiveMoney=${effectiveMoney}`);
            totalStockpile += country.stockpile;
            totalMoney += effectiveMoney;
        }

        logger.debug(`[PRICE_CALC] Total stockpile: ${totalStockpile}`);
        logger.debug(`[PRICE_CALC] Total effective money: ${totalMoney}`);
        logger.debug(`[PRICE_CALC] Country count: ${countries.length}`);

        let rawPrice = 1;
        if (totalStockpile > 0 && countries.length > 0) {
            const avgMoneyPerCountry = totalMoney / countries.length;
            rawPrice = avgMoneyPerCountry / totalStockpile;
            logger.debug(`[PRICE_CALC] Avg money per country: ${avgMoneyPerCountry.toFixed(2)}`);
            logger.debug(`[PRICE_CALC] Raw price (before min check): ${rawPrice.toFixed(2)}`);
        }

        const price = Math.max(rawPrice, 1);
        const rounded = Math.round(price);
        logger.debug(`[PRICE_CALC] Final base price (rounded): $${rounded}`);
        logger.debug(`[PRICE_CALC] -------------------------------`);

        return rounded;
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
