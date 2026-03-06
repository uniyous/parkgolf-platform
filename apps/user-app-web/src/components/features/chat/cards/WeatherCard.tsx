import React from 'react';
import { Cloud, Sun, CloudRain, Thermometer } from 'lucide-react';
import type { WeatherCardData } from '@/lib/api/chatApi';

interface WeatherCardProps {
  data: WeatherCardData;
}

const skyIcon = (sky: string) => {
  const lower = sky?.toLowerCase() || '';
  if (lower.includes('비') || lower.includes('rain')) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (lower.includes('맑') || lower === 'clear' || lower.includes('sunny')) return <Sun className="w-5 h-5 text-yellow-400" />;
  return <Cloud className="w-5 h-5 text-gray-400" />;
};

const skyLabel = (sky: string): string => {
  switch (sky) {
    case 'CLEAR': return '맑음';
    case 'PARTLY_CLOUDY': return '구름조금';
    case 'CLOUDY': return '구름많음';
    case 'OVERCAST': return '흐림';
    default: return sky;
  }
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  const locationName = data.clubName || data.location || '';
  const tempDisplay = data.minTemperature != null && data.maxTemperature != null
    ? `${data.minTemperature}°C / ${data.maxTemperature}°C`
    : `${data.temperature}°C`;

  return (
    <div className="mt-2 bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
      {locationName && (
        <p className="text-sm text-white/50 mb-1.5">{locationName} · {data.date}</p>
      )}
      <div className="flex items-center gap-3">
        {skyIcon(data.sky)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-white/50" />
            <span className="text-base text-white font-medium">{tempDisplay}</span>
            <span className="text-sm text-white/50">{skyLabel(data.sky)}</span>
          </div>
          {data.precipitation > 0 && (
            <p className="text-sm text-blue-400/80 mt-0.5">강수확률 {data.precipitation}%</p>
          )}
          {data.recommendation && (
            <p className="text-sm text-white/60 mt-1">{data.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
};
