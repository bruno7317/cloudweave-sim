import logger from "../logger";
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
    public name: string
    private stockpile: number
    private money_reserves: number
    private production_rate: number
    private consumption_rate: number

    constructor(options: CountryOptions) {
        this.name = options.name;
        this.stockpile = options.stockpile;
        this.money_reserves = options.money_reserves;
        this.production_rate = options.production_rate;
        this.consumption_rate = options.consumption_rate;
    }

    produce(): void {
        this.stockpile += this.production_rate;
        logger.info(`[PRODUCE] ${this.name} produced ${this.production_rate} units (stockpile: ${this.stockpile})`);
    }

    consume(): void {
        this.stockpile -= this.consumption_rate;
        logger.info(`[CONSUME] ${this.name} consumed ${this.consumption_rate} units (stockpile: ${this.stockpile})`);
    }

    createTradeOffer(options: Omit<TradeOfferOptions, 'author'>): TradeOffer {
        logger.debug(`[TRADE_OFFER] ${this.name} wants to ${options.trade_type} ${options.quantity} units @ ${options.unit_price}`);
        return new TradeOffer({ ...options, author: this });
    }

    depositResource(quantity: number): void {
        if (quantity > 0) {
            this.stockpile += quantity;
            logger.debug(`[RESOURCE_DEPOSIT] ${this.name} received ${quantity} units (stockpile: ${this.stockpile})`);
        } else {
            throw new Error(`A deposit of ${quantity} resources can't be made.`);
        }
    }

    withdrawResource(quantity: number): void {
        if (this.stockpile >= quantity) {
            this.stockpile -= quantity;
            logger.debug(`[RESOURCE_WITHDRAW] ${this.name} sent ${quantity} units (stockpile: ${this.stockpile})`);
        } else {
            throw new Error(`${this.name} doesn't have ${quantity} resources to withdraw.`);
        }
    }

    depositMoney(quantity: number): void {
        if (quantity > 0) {
            this.money_reserves += quantity;
            logger.debug(`[MONEY_DEPOSIT] ${this.name} received $${quantity} (reserves: ${this.money_reserves})`);
        } else {
            throw new Error(`A deposit of ${quantity} money can't be made.`);
        }
    }

    withdrawMoney(quantity: number): void {
        if (this.money_reserves >= quantity) {
            this.money_reserves -= quantity;
            logger.debug(`[MONEY_WITHDRAW] ${this.name} paid $${quantity} (reserves: ${this.money_reserves})`);
        } else {
            throw new Error(`${this.name} doesn't have ${quantity} money to withdraw.`);
        }
    }

    strategizeTrade(): void {
        const demand = this.consumption_rate - this.production_rate
        if (this.stockpile > (demand*2) && this.money_reserves < 100) {
            this.createTradeOffer({
                trade_type: TradeType.Sell,
                quantity: 5,
                unit_price: 4
            })
        }
        if (this.stockpile < demand ) {
            this.createTradeOffer({
                trade_type: TradeType.Buy,
                quantity: demand,
                unit_price: 5
            })
        }
    }
}

export default Country;
