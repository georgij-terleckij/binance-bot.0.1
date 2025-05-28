import React, { useEffect, useState } from 'react'
import Chart from 'react-apexcharts'
import axios from 'axios'

export default function PriceChart() {
  const [series, setSeries] = useState<{ data: [number, number][] }[]>([])

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchPrice = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/price?symbol=BTCUSDT')
      const current = parseFloat(res.data.price)
      const time = new Date().getTime()
      setSeries((prev) => [
        {
          data: [...(prev[0]?.data || []), [time, current]].slice(-30) // оставим только последние 30 точек
        }
      ])
    } catch (err) {
      console.error('Ошибка загрузки графика', err)
    }
  }

  return (
    <div className="mb-8">
      <Chart
        type="line"
        height={300}
        options={{
          chart: {
            id: 'price-chart',
            animations: {
              enabled: true,
              easing: 'linear',
              dynamicAnimation: { speed: 500 }
            }
          },
          xaxis: {
            type: 'datetime',
            labels: { datetimeFormatter: { hour: 'HH:mm:ss' } }
          },
          yaxis: {
            decimalsInFloat: 2
          },
          stroke: {
            curve: 'smooth'
          }
        }}
        series={series}
      />
    </div>
  )
}
