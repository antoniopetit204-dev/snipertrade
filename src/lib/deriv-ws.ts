// Deriv WebSocket API service
import { getSettings } from './store';

type MessageHandler = (data: any) => void;

class DerivWS {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reqId = 0;
  private pendingRequests: Map<number, { resolve: (data: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }> = new Map();
  private _isConnected = false;
  private _isAuthorized = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentAppId: string | null = null;
  private currentToken: string | null = null;

  get isConnected() { return this._isConnected; }
  get isAuthorized() { return this._isAuthorized; }

  private connectPromise: Promise<void> | null = null;

  connect(appId?: string): Promise<void> {
    // If already connecting, return existing promise to prevent race condition
    if (this.connectPromise && this.ws?.readyState === WebSocket.CONNECTING) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const id = appId || getSettings().appId;
      if (!id || id.trim() === '') { 
        reject(new Error('No App ID configured. Admin must set the App ID first.')); 
        this.connectPromise = null;
        return; 
      }
      
      this.currentAppId = id;
      
      // Already connected
      if (this.ws?.readyState === WebSocket.OPEN) { resolve(); this.connectPromise = null; return; }
      
      // Close any existing connection cleanly
      if (this.ws) {
        try { this.ws.onclose = null; this.ws.onerror = null; this.ws.close(); } catch {}
        this.ws = null;
      }
      
      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${id}`;
        console.log('[DerivWS] Connecting to:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[DerivWS] Connection timeout');
            try { this.ws?.close(); } catch {}
            reject(new Error('Connection timeout - check your App ID'));
          }
        }, 10000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this._isConnected = true;
          this.reconnectAttempts = 0;
          this.connectPromise = null;
          console.log('[DerivWS] Connected successfully');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle pending request responses
            if (data.req_id && this.pendingRequests.has(data.req_id)) {
              const pending = this.pendingRequests.get(data.req_id)!;
              clearTimeout(pending.timer);
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
              this.handlers.get(msgType)!.forEach(h => {
                try { h(data); } catch (e) { console.error('[DerivWS] Handler error:', e); }
              });
            }
          } catch (e) {
            console.error('[DerivWS] Message parse error:', e);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this._isConnected = false;
          this._isAuthorized = false;
          console.log('[DerivWS] Disconnected, code:', event.code, 'reason:', event.reason);
          
          // Auto-reconnect if not intentional
          if (this.currentAppId && this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`[DerivWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
            this.reconnectTimer = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect(this.currentAppId!).then(() => {
                if (this.currentToken) {
                  this.authorize(this.currentToken).catch(() => {});
                }
              }).catch(() => {});
            }, delay);
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(connectionTimeout);
          console.error('[DerivWS] WebSocket error');
          this._isConnected = false;
          this.connectPromise = null;
          reject(new Error('WebSocket connection failed. Verify your App ID is valid.'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect() {
    this.currentAppId = null;
    this.currentToken = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    // Clear all pending requests
    this.pendingRequests.forEach(p => {
      clearTimeout(p.timer);
      p.reject(new Error('Disconnected'));
    });
    if (this.ws) {
      try { this.ws.close(1000, 'Client disconnect'); } catch {}
      this.ws = null;
    }
    this._isConnected = false;
    this._isAuthorized = false;
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
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 15000);
      
      this.pendingRequests.set(reqId, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ ...request, req_id: reqId }));
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
    this.currentToken = token;
    const resp = await this.send({ authorize: token });
    if (resp.authorize) {
      this._isAuthorized = true;
    }
    return resp;
  }

  async getActiveSymbols() {
    return this.send({ active_symbols: 'brief', product_type: 'basic' });
  }

  async subscribeTicks(symbol: string) {
    return this.send({ ticks: symbol, subscribe: 1 });
  }

  async subscribeCandles(symbol: string, granularity = 60) {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: 100,
      end: 'latest',
      style: 'candles',
      granularity,
      subscribe: 1,
    });
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
