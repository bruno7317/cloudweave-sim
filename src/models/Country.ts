import logger from "../logger";
import Market from "./Market";
import TradeOffer, { TradeOfferOptions } from "./TradeOffer";
import TradeType from "./TradeType";

interface CountryOptions {
    name: string;
    stockpile: number;
    money_reserves: number;
    production_rate: number;
    consumption_rate: number;
}

class Country {
    private _name: string
    private _stockpile: number
    private _money_reserves: number
    private _production_rate: number
    private _consumption_rate: number
    private _instabilityScore = 0

    constructor(options: CountryOptions) {
        this._name = options.name;
        this._stockpile = options.stockpile;
        this._money_reserves = options.money_reserves;
        this._production_rate = options.production_rate;
        this._consumption_rate = options.consumption_rate;
    }

    get stockpile(): number {
        return this._stockpile
    }

    get money_reserves(): number {
        return this._money_reserves
    }

    get name(): string {
        return this._name
    }

    get resourceBalance(): number {
        return this._stockpile - this._consumption_rate;
    }

    get hasSurplus(): boolean {
        return this.resourceBalance > 0;
    }

    get hasDeficit(): boolean {
        return this.resourceBalance < 0;
    }

    get resourceSurplus(): number {
        return Math.max(0, this.resourceBalance);
    }

    get resourceDemand(): number {
        return Math.max(0, -this.resourceBalance);
    }

    produce(): void {
        this._stockpile += this._production_rate;
        logger.info(`[PRODUCE] ${this._name} produced ${this._production_rate} units (stockpile: ${this._stockpile})`);
    }

    consume(): void {
        this._stockpile -= this._consumption_rate;
        logger.info(`[CONSUME] ${this._name} consumed ${this._consumption_rate} units (stockpile: ${this._stockpile})`);
        if (this._stockpile < 0) {
            this._instabilityScore += 1;
            this._stockpile = 0;
            logger.warn(`[INSTABILITY] ${this._name} failed to meet oil demand. Instability score is now ${this._instabilityScore}.`);
        }
    }

    createTradeOffer(options: Omit<TradeOfferOptions, 'author'>): TradeOffer {
        return new TradeOffer({ ...options, author: this._name });
    }

    depositResource(quantity: number): void {
        if (quantity > 0) {
            this._stockpile += quantity;
            logger.debug(`[RESOURCE_DEPOSIT] ${this._name} received ${quantity} units (stockpile: ${this._stockpile})`);
        } else {
            throw new Error(`A deposit of ${quantity} resources can't be made.`);
        }
    }

    withdrawResource(quantity: number): void {
        if (this._stockpile >= quantity) {
            this._stockpile -= quantity;
            logger.debug(`[RESOURCE_WITHDRAW] ${this._name} sent ${quantity} units (stockpile: ${this._stockpile})`);
        } else {
            throw new Error(`${this._name} doesn't have ${quantity} resources to withdraw.`);
        }
    }

    depositMoney(quantity: number): void {
        if (quantity > 0) {
            this._money_reserves += quantity;
            logger.debug(`[MONEY_DEPOSIT] ${this._name} received $${quantity} (reserves: ${this._money_reserves})`);
        } else {
            throw new Error(`A deposit of ${quantity} money can't be made.`);
        }
    }

    withdrawMoney(quantity: number): void {
        this._money_reserves -= quantity;

        logger.debug(`[MONEY_WITHDRAW] ${this._name} paid $${quantity} (reserves: ${this._money_reserves})`);
    }

    assessMarket(availableOffers: TradeOffer[]): { sellerListings: TradeOffer[], buyerListings: TradeOffer[] } {
        const sellerListings = availableOffers
            .filter(o => o.type === TradeType.Sell)
            .sort((a, b) => a.unit_price - b.unit_price); // lowest price first

        const buyerListings = availableOffers
            .filter(o => o.type === TradeType.Buy)
            .sort((a, b) => b.unit_price - a.unit_price); // highest price first
        
        return { sellerListings, buyerListings }
    }

    createCompetitiveBuyOffer(base_price: number): TradeOffer | null {
        const targetPrice = base_price + 1
        const maxAffordableQty = Math.floor(this.money_reserves / targetPrice);
        const quantity = Math.min(this.resourceDemand, maxAffordableQty);

        if (quantity <= 0) {
            logger.debug(`[DECISION] ${this.name} can't afford to buy oil right now.`);
            return null
        }

        logger.debug(`[DECISION] ${this.name} will BUY ${quantity} units @ $${targetPrice}`);
        return this.createTradeOffer({
            trade_type: TradeType.Buy,
            quantity,
            unit_price: targetPrice
        });
    }

    createFallbackBuyOffer(base_price: number): TradeOffer {
        logger.debug(`[DECISION] ${this.name} sees no oil for sale, but needs it. Will place a buy offer anyway.`);
        return this.createTradeOffer({
            trade_type: TradeType.Buy,
            quantity: this.resourceDemand,
            unit_price: base_price
        });
    }

    fulfillFromMarket(sellerListings: TradeOffer[]): void {
        for (const sellOffer of sellerListings) {
            if (!this.hasDeficit) break;

            sellOffer.accept(this._name);
        }
    }

    decideBuyAction(sellerListings: TradeOffer[], base_price: number): TradeOffer | null {
        logger.debug(`[THOUGHT] ${this.name} needs ${this.resourceDemand} units.`);

        this.fulfillFromMarket(sellerListings)

        if (this.hasDeficit) {
            logger.debug(`[DECISION] ${this.name} couldn't satisfy its needs from existing SELL offers. Placing a BUY offer.`);
            return this.createCompetitiveBuyOffer(base_price)
        }
        
        logger.debug(`[DECISION] ${this.name} decides not to post BUY offers.`);
        return null;
    }

    createFallbackSellOffer(base_price: number): TradeOffer {
        logger.debug(`[DECISION] ${this.name} has surplus but no buyers. Sell at market rate.`);
        return this.createTradeOffer({
            trade_type: TradeType.Sell,
            quantity: this.resourceSurplus,
            unit_price: base_price
        });
    }

    createCompetitiveSellOffer(base_price: number): TradeOffer {
        const targetPrice = base_price - 1;
        const quantity = this.resourceSurplus;
        logger.debug(`[DECISION] ${this.name} will SELL ${quantity} units @ $${targetPrice}`);

        return this.createTradeOffer({
            trade_type: TradeType.Sell,
            quantity,
            unit_price: targetPrice
        });
    }

    fulfillMarketDemand(buyerListings: TradeOffer[]): void {
        for(const buyOffer of buyerListings) {
            if (!this.hasSurplus) break;

            buyOffer.accept(this._name);
        }
    }

    decideSellAction(buyerListings: TradeOffer[], base_price: number): TradeOffer | null {
        logger.debug(`[THOUGHT] ${this.name} has a surplus of ${this.resourceSurplus} units.`);
        
        this.fulfillMarketDemand(buyerListings);

        if (this.hasSurplus) {
            const bestBuyer = buyerListings[0];
            logger.debug(`[DECISION] ${this.name} has oil to sell but there are no BUY offers. Placing a SELL offer.`);
            return this.createCompetitiveSellOffer(base_price)
        }
        
        logger.debug(`[DECISION] ${this.name} decides not to post SELL offers.`);
        return null;
    }

    strategizeTrade(availableOffers: TradeOffer[], base_price: number): TradeOffer[] {
        logger.debug(`[STRATEGY] ${this.name} is evaluating trade strategy...`);
        logger.debug(`[STRATEGY] Stockpile: ${this._stockpile}, Consumption Rate: ${this._consumption_rate}, Money Reserves: ${this._money_reserves}`);
        
        const { sellerListings, buyerListings } = this.assessMarket(availableOffers)

        const offers: TradeOffer[] = [];

        const buyOffer = this.decideBuyAction(sellerListings, base_price)
        if (buyOffer) offers.push(buyOffer);

        const sellOffer = this.decideSellAction(buyerListings, base_price)
        if (sellOffer) offers.push(sellOffer);

        return offers;
    }

}

export default Country;
