import logger from "../logger";
import TradeOffer from "./TradeOffer";

interface MarketOptions {
    // For now, empty — placeholder for future config like fee rates, max offers, etc.
}

class Market {
    private offers: TradeOffer[] = [];

    constructor(options: MarketOptions) {
        logger.debug("[MARKET] Market initialized.");
    }

    addOffer(offer: TradeOffer): void {
        this.offers.push(offer);
        logger.debug(`[MARKET] New ${offer.offerType} offer added by ${offer.authorName}`);
    }

    getAvailableOffers(): TradeOffer[] {
        logger.debug(`[MARKET] Returning ${this.offers.length} current offers`);
        return this.offers;
    }

    matchOffers(): void {
        logger.debug("[MARKET] Attempting to match offers...");

        // Placeholder — your matching logic will go here

        logger.debug("[MARKET] Matchmaking complete (no logic implemented yet).");
    }
}

export default Market;
