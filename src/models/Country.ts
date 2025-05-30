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

    strategizeTrade(availableOffers: TradeOffer[]): TradeOffer | null {
        logger.debug(`[STRATEGY] ${this.name} is evaluating trade strategy...`);
        logger.debug(`[STRATEGY] 
            Stockpile: ${this.stockpile}, 
            Consumption Rate: ${this._consumption_rate}, 
            Money Reserves: ${this.money_reserves}
        `);

        const buyOffers = availableOffers
            .filter(o => o.type === TradeType.Sell)
            .sort((a, b) => a.unit_price - b.unit_price); // lowest price first

        const sellOffers = availableOffers
            .filter(o => o.type === TradeType.Buy)
            .sort((a, b) => b.unit_price - a.unit_price); // highest price first

        const hasDeficit = this.stockpile < this._consumption_rate;
        const hasSurplus = this.stockpile > (this._consumption_rate * 2);
        const MIN_SELL_PRICE = 4;
        let offer = null;

        if (hasDeficit) {
            const needed = this._consumption_rate - this.stockpile;
            logger.debug(`[THOUGHT] ${this.name} thinks: "I can't risk running out of oil. I need at least ${needed} units."`);

            const cheapestOffer = buyOffers[0];
            if (cheapestOffer) {
                const maxAffordableQty = Math.floor(this.money_reserves / cheapestOffer.unit_price);
                const quantity = Math.min(needed, maxAffordableQty);

                if (quantity > 0) {
                    logger.debug(`[DECISION] ${this.name} will BUY ${quantity} units @ $${cheapestOffer.unit_price}`);
                    offer = this.createTradeOffer({
                        trade_type: TradeType.Buy,
                        quantity,
                        unit_price: cheapestOffer.unit_price + 1 // bid slightly higher to compete
                    });
                } else {
                    logger.debug(`[DECISION] ${this.name} can't afford to buy oil right now.`);
                }
            } else {
                logger.debug(`[DECISION] ${this.name} sees no oil for sale, but needs it. Will place a buy offer anyway.`);
                offer = this.createTradeOffer({
                    trade_type: TradeType.Buy,
                    quantity: needed,
                    unit_price: 6 // arbitrary high price to attract sellers
                });
            }
        }

        if (hasSurplus) {
            const bestBuyer = sellOffers[0];
            if (bestBuyer && bestBuyer.unit_price >= MIN_SELL_PRICE) {
                const quantity = Math.min(5, this.stockpile - this._consumption_rate); // keep enough for own needs
                logger.debug(`[DECISION] ${this.name} will SELL ${quantity} units @ $${bestBuyer.unit_price}`);
                offer = this.createTradeOffer({
                    trade_type: TradeType.Sell,
                    quantity,
                    unit_price: bestBuyer.unit_price - 1 // slightly undercut to win
                });
            } else {
                logger.debug(`[THOUGHT] ${this.name} has surplus but no good buy offers. Holding off for now.`);
            }
        }

        if (!offer) {
            logger.debug(`[DECISION] ${this.name} chooses not to trade this turn.`);
        }
        return offer;
    }

}

export default Country;
