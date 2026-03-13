// Deriv WebSocket API service
import { getSettings } from './store';

type MessageHandler = (data: any) => void;

class DerivWS {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reqId = 0;
  private pendingRequests: Map<number, { resolve: (data: any) => void; reject: (err: any) => void }> = new Map();
  private _isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected() { return this._isConnected; }

  connect(appId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = appId || getSettings().appId;
      if (!id) { reject(new Error('No App ID configured')); return; }
      
      if (this.ws?.readyState === WebSocket.OPEN) { resolve(); return; }
      
      try {
        this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${id}`);
        
        this.ws.onopen = () => {
          this._isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          // Handle pending request responses
          if (data.req_id && this.pendingRequests.has(data.req_id)) {
            const pending = this.pendingRequests.get(data.req_id)!;
            this.pendingRequests.delete(data.req_id);
            if (data.error) {
              pending.reject(data.error);
            } else {
              pending.resolve(data);
            }
          }

          // Handle subscription messages
          const msgType = data.msg_type;
          if (msgType && this.handlers.has(msgType)) {
            this.handlers.get(msgType)!.forEach(h => h(data));
          }
        };

        this.ws.onclose = () => {
          this._isConnected = false;
        };

        this.ws.onerror = () => {
          this._isConnected = false;
          reject(new Error('WebSocket connection failed'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this.handlers.clear();
    this.pendingRequests.clear();
  }

  send(request: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const reqId = ++this.reqId;
      this.pendingRequests.set(reqId, { resolve, reject });
      this.ws.send(JSON.stringify({ ...request, req_id: reqId }));
      
      // Timeout after 15s
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 15000);
    });
  }

  subscribe(msgType: string, handler: MessageHandler) {
    if (!this.handlers.has(msgType)) {
      this.handlers.set(msgType, []);
    }
    this.handlers.get(msgType)!.push(handler);
    return () => {
      const handlers = this.handlers.get(msgType);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  async authorize(token: string) {
    return this.send({ authorize: token });
  }

  async getActiveSymbols() {
    return this.send({ active_symbols: 'brief', product_type: 'basic' });
  }

  async subscribeTicks(symbol: string) {
    return this.send({ ticks: symbol, subscribe: 1 });
  }

  async getTicksHistory(symbol: string, count = 100) {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count,
      end: 'latest',
      style: 'ticks',
    });
  }

  async getCandlesHistory(symbol: string, count = 100, granularity = 60) {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count,
      end: 'latest',
      style: 'candles',
      granularity,
    });
  }

  async getBalance() {
    return this.send({ balance: 1, subscribe: 1 });
  }

  async getStatement(limit = 20) {
    return this.send({ statement: 1, description: 1, limit });
  }

  async getContractsFor(symbol: string) {
    return this.send({ contracts_for: symbol, currency: 'USD', product_type: 'basic' });
  }

  async buyContract(proposal_id: string, price: number) {
    return this.send({ buy: proposal_id, price });
  }

  async getProposal(params: Record<string, any>) {
    return this.send({ proposal: 1, ...params, subscribe: 1 });
  }

  async sellContract(contract_id: number, price = 0) {
    return this.send({ sell: contract_id, price });
  }

  async getOpenContracts() {
    return this.send({ portfolio: 1 });
  }

  async getProfitTable(limit = 20) {
    return this.send({ profit_table: 1, description: 1, limit, sort: 'DESC' });
  }

  async forgetAll(type: string) {
    return this.send({ forget_all: type });
  }

  async ping() {
    return this.send({ ping: 1 });
  }
}

// Singleton instance
export const derivWS = new DerivWS();
