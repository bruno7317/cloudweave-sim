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
    private _buyer?: Country;
    private _seller?: Country;
    public readonly type: TradeType;
    public quantity: number;
    public readonly unit_price: number;

    constructor(options: TradeOfferOptions) {
        this.type = options.trade_type;
        this.quantity = options.quantity;
        this.unit_price = options.unit_price;

        if (this.type === TradeType.Buy) {
            this._buyer = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author.name} created a BUY offer: ${this.quantity} units @ ${this.unit_price}`);
        } else {
            this._seller = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author.name} created a SELL offer: ${this.quantity} units @ ${this.unit_price}`);
        }
    }

    get authorName(): string {
        return this._buyer?.name ?? this._seller?.name ?? "Unknown";
    }

    accept(counterparty: Country): void {
        if (this.type === TradeType.Buy) {
            this._seller = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty.name} accepted BUY offer from ${this._buyer?.name}`);
        } else {
            this._buyer = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty.name} accepted SELL offer from ${this._seller?.name}`);
        }
    }

    isReadyToProcess(): boolean {
        return this._seller !== undefined && this._buyer !== undefined;
    }

    process(): void {
        if (!this.isReadyToProcess()) {
            throw new Error(`Trade Offer is not ready to process. Buyer: ${this._buyer}, Seller: ${this._seller}`);
        }

        const total = this.quantity * this.unit_price;
        const seller = this._seller!;
        const buyer = this._buyer!;

        logger.info(`[TRADE_PROCESS] ${buyer.name} buys ${this.quantity} units @ ${this.unit_price} each from ${seller.name} (total: ${total})`);

        seller.withdrawResource(this.quantity);
        buyer.withdrawMoney(total);
        seller.depositMoney(total);
        buyer.depositResource(this.quantity);
    }
}

export default TradeOffer;
