import React from 'react';
import { Cloud, Sun, CloudRain, Thermometer } from 'lucide-react';
import type { WeatherCardData } from '@/lib/api/chatApi';

interface WeatherCardProps {
  data: WeatherCardData;
}

const skyIcon = (sky: string) => {
  const lower = sky?.toLowerCase() || '';
  if (lower.includes('비') || lower.includes('rain')) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (lower.includes('맑') || lower.includes('clear') || lower.includes('sunny')) return <Sun className="w-5 h-5 text-yellow-400" />;
  return <Cloud className="w-5 h-5 text-gray-400" />;
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  return (
    <div className="mt-2 bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="flex items-center gap-3">
        {skyIcon(data.sky)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-white/50" />
            <span className="text-sm text-white font-medium">{data.temperature}°C</span>
            <span className="text-xs text-white/50">{data.sky}</span>
          </div>
          {data.recommendation && (
            <p className="text-xs text-white/60 mt-1">{data.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
};
