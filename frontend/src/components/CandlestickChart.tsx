// src/components/CandlestickChart.tsx
import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';

type Candle = {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
};

type GridLine = {
  y: number;
  borderColor: string;
  label: {
    text: string;
    style: { background: string; color: string };
  };
};

export default function CandlestickChart() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const candleRes = await axios.get('http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m');
        const gridRes = await axios.get('http://localhost:8000/api/grid-trade?symbol=BTCUSDT');

        setCandles(candleRes.data.candles || []);
        const levels = gridRes.data.gridTrade || [];

        const lines = levels.flatMap((level: any, i: number) => {
          const buyColor = getColorByStatus(level.status, true);
          const sellColor = getColorByStatus(level.status, false);

          return [
            {
              y: parseFloat(level.buy.price),
              borderColor: buyColor,
              label: {
                text: `Buy #${i + 1} @ ${level.buy.price}`,
                style: { background: buyColor, color: '#fff' },
              },
            },
            {
              y: parseFloat(level.sell.price),
              borderColor: sellColor,
              label: {
                text: `Sell #${i + 1} @ ${level.sell.price}`,
                style: { background: sellColor, color: '#fff' },
              },
            },
          ];
        });

        setGridLines(lines);
        setIsLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const getColorByStatus = (status: string, isBuy: boolean) => {
    if (status === 'buy-triggered' && isBuy) return '#00b894';
    if (status === 'sell-triggered' && !isBuy) return '#d63031';
    return '#636e72';
  };

  if (isLoading || candles.length === 0) {
    return <div>📊 Загрузка графика...</div>;
  }

  const series = [
    {
      data: candles.map((c) => ({
        x: new Date(c.t),
        y: [parseFloat(c.o), parseFloat(c.h), parseFloat(c.l), parseFloat(c.c)],
      })),
    },
  ];

  const options = {
    chart: {
      type: 'candlestick',
      height: 350,
      animations: { enabled: false },
    },
    xaxis: {
      type: 'datetime',
    },
    yaxis: {
      tooltip: { enabled: true },
    },
    annotations: {
      yaxis: gridLines,
    },
  };

  return (
    <div>
      <h3 className="mb-2">BTC/USDT</h3>
      <Chart options={options} series={series} type="candlestick" height={400} />
    </div>
  );
}
