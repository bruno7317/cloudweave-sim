import logger from "../logger";
import TradeType from "./TradeType";

export interface TradeOfferOptions {
    trade_type: TradeType;
    quantity: number;
    unit_price: number;
    author: string;
}

class TradeOffer {
    private _buyer?: string;
    private _seller?: string;
    public readonly type: TradeType;
    public quantity: number;
    public readonly unit_price: number;
    public ttl: number = 3;
    public createdAt?: number;

    constructor(options: TradeOfferOptions) {
        this.type = options.trade_type;
        this.quantity = options.quantity;
        this.unit_price = options.unit_price;

        if (this.type === TradeType.Buy) {
            this._buyer = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author} created a BUY offer: ${this.quantity} units @ ${this.unit_price}`);
        } else {
            this._seller = options.author;
            logger.debug(`[TRADE_CREATE] ${options.author} created a SELL offer: ${this.quantity} units @ ${this.unit_price}`);
        }
    }

    get authorName(): string {
        return this._buyer ?? this._seller ?? "Unknown";
    }

    get seller(): string | undefined {
        return this._seller
    }

    get buyer(): string | undefined {
        return this._buyer
    }

    get totalCost(): number {
        return this.quantity * this.unit_price
    }

    isExpired(currentTurn: number): boolean {
        return (currentTurn - this.createdAt!) >= this.ttl;
    }

    accept(counterparty: string): boolean {
        if (this.type === TradeType.Buy) {
            this._seller = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty} accepted BUY offer from ${this._buyer}`);
        } else {
            this._buyer = counterparty;
            logger.info(`[TRADE_ACCEPT] ${counterparty} accepted SELL offer from ${this._seller}`);
        }
        return true;
    }

    isReadyToProcess(): boolean {
        return !!this._seller && !!this._buyer;
    }
}

export default TradeOffer;
