import logger from "../logger";
import Country from "./Country";
import TradeType from "./TradeType";

export interface TradeOfferOptions {
    trade_type: TradeType;
    quantity: number;
    unit_price: number;
    author: Country;
}

class TradeOffer {
    private buyer?: Country;
    private seller?: Country;
    private type: TradeType;
    private quantity: number;
    private unit_price: number;

    constructor(options: TradeOfferOptions) {
        this.type = options.trade_type;
        this.quantity = options.quantity;
        this.unit_price = options.unit_price;

        if (this.type === TradeType.Buy) {
            this.buyer = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author.name} created a BUY offer: ${this.quantity} units @ ${this.unit_price}`);
        } else {
            this.seller = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author.name} created a SELL offer: ${this.quantity} units @ ${this.unit_price}`);
        }
    }

    accept(counterparty: Country): void {
        if (this.type === TradeType.Buy) {
            this.seller = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty.name} accepted BUY offer from ${this.buyer?.name}`);
        } else {
            this.buyer = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty.name} accepted SELL offer from ${this.seller?.name}`);
        }
    }

    isReadyToProcess(): boolean {
        return this.seller !== undefined && this.buyer !== undefined;
    }

    process(): void {
        if (!this.isReadyToProcess()) {
            throw new Error(`Trade Offer is not ready to process. Buyer: ${this.buyer}, Seller: ${this.seller}`);
        }

        const total = this.quantity * this.unit_price;
        const seller = this.seller!;
        const buyer = this.buyer!;

        logger.info(`[TRADE_PROCESS] ${buyer.name} buys ${this.quantity} units @ ${this.unit_price} each from ${seller.name} (total: ${total})`);

        seller.withdrawResource(this.quantity);
        buyer.withdrawMoney(total);
        seller.depositMoney(total);
        buyer.depositResource(this.quantity);
    }
}

export default TradeOffer;
