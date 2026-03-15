import { useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { derivWS } from '@/lib/deriv-ws';

interface TradingViewChartProps {
  symbol: string;
  granularity?: number;
  height?: number;
}

export const TradingViewChart = ({ symbol, granularity = 60, height = 500 }: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(218, 12%, 55%)',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsl(220, 10%, 15%)' },
        horzLines: { color: 'hsl(220, 10%, 15%)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'hsl(47, 97%, 60%)', width: 1, style: 2, labelBackgroundColor: 'hsl(220, 14%, 11%)' },
        horzLine: { color: 'hsl(47, 97%, 60%)', width: 1, style: 2, labelBackgroundColor: 'hsl(220, 14%, 11%)' },
      },
      rightPriceScale: {
        borderColor: 'hsl(220, 10%, 20%)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'hsl(220, 10%, 20%)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(160, 85%, 43%)',
      downColor: 'hsl(356, 90%, 62%)',
      borderUpColor: 'hsl(160, 85%, 43%)',
      borderDownColor: 'hsl(356, 90%, 62%)',
      wickUpColor: 'hsl(160, 85%, 50%)',
      wickDownColor: 'hsl(356, 90%, 68%)',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    const cleanup = initChart();
    return () => cleanup?.();
  }, [initChart]);

  useEffect(() => {
    if (!derivWS.isConnected || !symbol || !candleSeriesRef.current) return;

    const fetchData = async () => {
      try {
        await derivWS.forgetAll('candles');
        const resp = await derivWS.getCandlesHistory(symbol, 500, granularity);
        if (resp.candles && candleSeriesRef.current) {
          const candles: CandlestickData[] = resp.candles.map((c: any) => ({
            time: c.epoch as Time,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));
          candleSeriesRef.current.setData(candles);

          if (volumeSeriesRef.current) {
            const volumes = resp.candles.map((c: any) => ({
              time: c.epoch as Time,
              value: Math.abs(parseFloat(c.high) - parseFloat(c.low)) * 10000,
              color: parseFloat(c.close) >= parseFloat(c.open)
                ? 'rgba(52, 211, 153, 0.3)'
                : 'rgba(239, 83, 80, 0.3)',
            }));
            volumeSeriesRef.current.setData(volumes);
          }

          chartRef.current?.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Chart data error:', err);
      }
    };

    fetchData();

    derivWS.subscribeCandles(symbol, granularity).catch(() => {});

    const unsub = derivWS.subscribe('ohlc', (data) => {
      if (data.ohlc && candleSeriesRef.current) {
        const c = data.ohlc;
        candleSeriesRef.current.update({
          time: parseInt(c.open_time) as Time,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        });
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: parseInt(c.open_time) as Time,
            value: Math.abs(parseFloat(c.high) - parseFloat(c.low)) * 10000,
            color: parseFloat(c.close) >= parseFloat(c.open)
              ? 'rgba(52, 211, 153, 0.3)'
              : 'rgba(239, 83, 80, 0.3)',
          });
        }
      }
    });

    return () => { unsub(); };
  }, [symbol, granularity]);

  return (
    <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
  );
};
