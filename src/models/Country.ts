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

    strategizeTrade(currentOffers: TradeOffer[]): TradeOffer | null {
        const demand = this._consumption_rate - this._production_rate;
        let offer: TradeOffer | null = null;

        logger.debug(`[STRATEGY] ${this._name} is evaluating trade strategy...`);
        logger.debug(`[STRATEGY] Demand: ${demand}, Stockpile: ${this._stockpile}, Money Reserves: ${this._money_reserves}`);

        if (this._stockpile > (demand * 2)) {
            logger.debug(`[THOUGHT] ${this._name} thinks: "I've got plenty of oil. Let's sell some."`);
            offer = this.createTradeOffer({
                trade_type: TradeType.Sell,
                quantity: 5,
                unit_price: 4
            });
        }

        if (this._stockpile < demand) {
            logger.debug(`[THOUGHT] ${this._name} thinks: "I'm running low on oil. Let's buy some."`);
            offer = this.createTradeOffer({
                trade_type: TradeType.Buy,
                quantity: demand,
                unit_price: 5
            });
        }

        if (!offer) {
            logger.debug(`[THOUGHT] ${this._name} decides to hold off on trading this turn.`);
        }

        return offer;
    }

}

export default Country;
