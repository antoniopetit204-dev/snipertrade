import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { getUser } from '@/lib/store';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardPortfolio = () => {
  const user = getUser();
  const { connected, authorized, balance, currency } = useDerivConnection();
  const [statement, setStatement] = useState<any[]>([]);
  const [openContracts, setOpenContracts] = useState<any[]>([]);
  const [profitTable, setProfitTable] = useState<any[]>([]);

  useEffect(() => {
    if (!connected || !authorized) return;
    const fetchData = async () => {
      try {
        const [stmtResp, portfolioResp, profitResp] = await Promise.allSettled([
          derivWS.getStatement(50),
          derivWS.getOpenContracts(),
          derivWS.getProfitTable(50),
        ]);
        if (stmtResp.status === 'fulfilled' && stmtResp.value.statement?.transactions) {
          setStatement(stmtResp.value.statement.transactions);
        }
        if (portfolioResp.status === 'fulfilled' && portfolioResp.value.portfolio?.contracts) {
          setOpenContracts(portfolioResp.value.portfolio.contracts);
        }
        if (profitResp.status === 'fulfilled' && profitResp.value.profit_table?.transactions) {
          setProfitTable(profitResp.value.profit_table.transactions);
        }
      } catch {}
    };
    fetchData();
  }, [connected, authorized]);

  if (!user) return null;

  const totalPnL = profitTable.reduce((s, t) => s + parseFloat(t.profit || 0), 0);

  return (
    <DashboardLayout title="Portfolio" icon={<Wallet className="h-5 w-5 text-primary" />}>
      <div className="space-y-4 sm:space-y-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Account Balance</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {balance !== null ? `${balance.toFixed(2)}` : '—'} <span className="text-sm text-primary">{currency}</span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Open Positions</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">{openContracts.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total P&L (Recent)</p>
            <p className={`text-2xl sm:text-3xl font-bold font-mono ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Open Positions */}
        {openContracts.length > 0 && (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Open Positions</h2>
            </div>
            <div className="divide-y divide-border">
              {openContracts.map((c: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="px-3 sm:px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">{c.symbol}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{c.contract_type} • Buy: {c.buy_price}</p>
                  </div>
                  <span className={`text-xs sm:text-sm font-mono font-medium ${(c.payout - c.buy_price) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {(c.payout - c.buy_price) >= 0 ? '+' : ''}{(c.payout - c.buy_price).toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Profit Table */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Trade History</h2>
          </div>
          {profitTable.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-3 sm:px-4 py-2">Date</th>
                    <th className="text-left px-3 sm:px-4 py-2 hidden sm:table-cell">Contract</th>
                    <th className="text-right px-3 sm:px-4 py-2">Buy</th>
                    <th className="text-right px-3 sm:px-4 py-2">Sell</th>
                    <th className="text-right px-3 sm:px-4 py-2">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profitTable.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-accent/30">
                      <td className="px-3 sm:px-4 py-2 font-mono text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
                        {new Date(t.purchase_time * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-foreground hidden sm:table-cell truncate max-w-[150px]">{t.shortcode || t.contract_id}</td>
                      <td className="px-3 sm:px-4 py-2 font-mono text-right text-foreground">{t.buy_price}</td>
                      <td className="px-3 sm:px-4 py-2 font-mono text-right text-foreground">{t.sell_price}</td>
                      <td className={`px-3 sm:px-4 py-2 font-mono text-right font-medium ${parseFloat(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {parseFloat(t.profit) >= 0 ? '+' : ''}{t.profit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs sm:text-sm">
              {connected && authorized ? 'No trade history yet' : 'Connect & authorize to see your trade history'}
            </div>
          )}
        </div>

        {/* Statement */}
        {statement.length > 0 && (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Account Statement</h2>
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {statement.map((tx: any, i: number) => (
                <div key={i} className="px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{tx.action_type}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{new Date(tx.transaction_time * 1000).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono ${tx.amount >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">Bal: {tx.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPortfolio;
