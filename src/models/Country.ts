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

    get projectedResourceBalance(): number {
        return this._stockpile + this._production_rate - this._consumption_rate;
    }

    get hasSurplus(): boolean {
        return this.projectedResourceBalance > 0;
    }

    get hasDeficit(): boolean {
        return this.projectedResourceBalance < 0;
    }

    get resourceSurplus(): number {
        return Math.max(0, this.projectedResourceBalance);
    }

    get resourceDemand(): number {
        return Math.max(0, -this.projectedResourceBalance);
    }

    produce(): void {
        this._stockpile += this._production_rate;
        logger.info(`[PRODUCE] ${this._name} produced ${this._production_rate} units (stockpile: ${this._stockpile})`);
    }

    consume(): void {
        this._stockpile -= this._consumption_rate;
        logger.info(`[CONSUME] ${this._name} consumed ${this._consumption_rate} units (stockpile: ${this._stockpile})`);
    }

    createTradeOffer(options: Omit<TradeOfferOptions, 'author'>): TradeOffer {
        logger.debug(`[TRADE_OFFER] ${this._name} wants to ${options.trade_type} ${options.quantity} units @ ${options.unit_price}`);
        return new TradeOffer({ ...options, author: this });
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
        if (this._money_reserves >= quantity) {
            this._money_reserves -= quantity;
            logger.debug(`[MONEY_WITHDRAW] ${this._name} paid $${quantity} (reserves: ${this._money_reserves})`);
        } else {
            throw new Error(`${this._name} doesn't have ${quantity} money to withdraw.`);
        }
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

    createCompetitiveBuyOffer(base_price: number, cheapestOffer: TradeOffer): TradeOffer | null {
        const maxAffordableQty = Math.floor(this.money_reserves / base_price);
        const quantity = Math.min(this.resourceDemand, maxAffordableQty);

        if (quantity <= 0) {
            logger.debug(`[DECISION] ${this.name} can't afford to buy oil right now.`);
            return null
        }

        logger.debug(`[DECISION] ${this.name} will BUY ${quantity} units @ $${cheapestOffer.unit_price}`);
        return this.createTradeOffer({
            trade_type: TradeType.Buy,
            quantity,
            unit_price: cheapestOffer.unit_price + 1 // bid slightly higher to compete
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

    decideBuyAction(sellerListings: TradeOffer[], base_price: number): TradeOffer | null {
        logger.debug(`[THOUGHT] ${this.name} thinks: "I can't risk running out of oil. I need at least ${this.resourceDemand} units."`);
        const cheapestOffer = sellerListings[0];
        if (!cheapestOffer) {
            return this.createFallbackBuyOffer(base_price)
        }

        return this.createCompetitiveBuyOffer(base_price, cheapestOffer)
    }

    createFallbackSellOffer(base_price: number): TradeOffer {
        logger.debug(`[DECISION] ${this.name} has surplus but no buyers. Sell at market rate.`);
        return this.createTradeOffer({
            trade_type: TradeType.Sell,
            quantity: this.resourceSurplus,
            unit_price: base_price
        });
    }

    createCompetitiveSellOffer(base_price: number, bestBuyer: TradeOffer): TradeOffer {
        const quantity = this.resourceSurplus;
        const targetPrice = Math.max(base_price, bestBuyer.unit_price - 1);
        logger.debug(`[DECISION] ${this.name} will SELL ${quantity} units @ $${targetPrice}`);

        return this.createTradeOffer({
            trade_type: TradeType.Sell,
            quantity,
            unit_price: targetPrice
        });
    }

    decideSellAction(buyerListings: TradeOffer[], base_price: number): TradeOffer | null {
        const bestBuyer = buyerListings[0];
        if (!bestBuyer) {
            return this.createFallbackSellOffer(base_price);
        }

        return this.createCompetitiveSellOffer(base_price, bestBuyer)
    }

    strategizeTrade(availableOffers: TradeOffer[], base_price: number): TradeOffer | null {
        logger.debug(`[STRATEGY] ${this.name} is evaluating trade strategy...`);
        logger.debug(`[STRATEGY] 
            Stockpile: ${this._stockpile}, 
            Consumption Rate: ${this._consumption_rate}, 
            Money Reserves: ${this._money_reserves}
        `);
        
        const { sellerListings, buyerListings } = this.assessMarket(availableOffers)

        if (this.hasDeficit) {
            return this.decideBuyAction(sellerListings, base_price)
        } else if (this.hasSurplus) {
            return this.decideSellAction(buyerListings, base_price)
        } else {
            logger.debug(`[DECISION] ${this.name} chooses not to trade this turn.`);
            return null;
        }    
    }

}

export default Country;
