import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PlantCharts = ({ logs }) => {
  const [selectedYear, setSelectedYear] = useState('all');

  if (!logs || !Array.isArray(logs)) return null;

  // Extract available years for filter
  const years = [...new Set(logs.map(l => l.date ? l.date.substring(0, 4) : ''))].filter(Boolean).sort().reverse();

  let filteredLogs = selectedYear !== 'all' ? logs.filter(l => l.date && l.date.startsWith(selectedYear)) : logs;

  // Height Chart Data
  const heightLogs = filteredLogs.filter(l => l.type === 'Misurazione' && l.height !== null && l.height !== undefined && !isNaN(l.height));
  heightLogs.sort((a, b) => new Date(a.date) - new Date(b.date));

  const formatDateIt = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const growthData = {
    labels: heightLogs.map(l => formatDateIt(l.date)),
    datasets: [{
      label: 'Altezza Pianta (cm)',
      data: heightLogs.map(l => parseFloat(l.height)),
      borderColor: '#2e7d32',
      backgroundColor: 'rgba(46, 125, 50, 0.2)',
      borderWidth: 2,
      pointBackgroundColor: '#2e7d32',
      pointRadius: 5,
      fill: true,
      tension: 0.3
    }]
  };

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `📈 Curva di crescita${selectedYear !== 'all' ? ' - ' + selectedYear : ''}`,
        color: '#888'
      },
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Events Chart Data
  const eventLogs = filteredLogs.filter(l => l.type !== 'Misurazione');
  eventLogs.sort((a, b) => new Date(a.date) - new Date(b.date));

  const rawEventLabels = [...new Set(eventLogs.map(l => l.date))];
  const eventLabels = rawEventLabels.map(d => formatDateIt(d));
  
  const yCategories = [
    'Innesto', 
    'Rinvaso / Sistemazione', 
    'Misurazione pH', 
    'Raccolto', 
    'Fruttificazione', 
    'Fioritura', 
    'Stato di Salute', 
    'Spostamento', 
    'Concimazione', 
    'Trattamento', 
    'Innaffiatura',
    'Generico',
    'Problema / Malattia'
  ];

  const eventsData = {
    labels: eventLabels,
    datasets: [{
      label: 'Eventi',
      data: eventLogs.map(l => {
        let text = l.note || '';
        if (l.type === 'Misurazione pH' && l.ph) text = `pH: ${l.ph}` + (text ? ` (${text})` : '');
        if (l.type === 'Raccolto' && l.harvest) text = `Resa: ${l.harvest}` + (text ? ` (${text})` : '');
        if (l.type === 'Rinvaso / Sistemazione' && l.placement) text = `Nuovo: ${l.placement} ${l.potSize ? `(${l.potSize}L)` : ''}` + (text ? ` (${text})` : '');
        if (l.type === 'Innesto' && l.graftName) text = `Nuovo: ${l.graftName}` + (text ? ` (${text})` : '');

        return {
          x: formatDateIt(l.date),
          y: l.type,
          note: text
        };
      }),
      backgroundColor: '#f57f17',
      borderColor: '#f57f17',
      pointRadius: 8,
      pointHoverRadius: 12,
      showLine: false
    }]
  };

  const eventsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `🌱 Fasi fenologiche ed eventi${selectedYear !== 'all' ? ' - ' + selectedYear : ''}`,
        color: '#888'
      },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Nota: ${context.raw.note ? context.raw.note : 'Nessuna nota aggiuntiva'}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        labels: eventLabels
      },
      y: {
        type: 'category',
        labels: yCategories
      }
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>📊 Analisi Dati</h3>
        {years.length > 0 && (
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="all">Tutti gli anni</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '300px', background: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
          <Line options={growthOptions} data={growthData} />
        </div>
        
        <div style={{ height: '350px', background: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
          <Line options={eventsOptions} data={eventsData} />
        </div>
      </div>
    </div>
  );
};

export default PlantCharts;
