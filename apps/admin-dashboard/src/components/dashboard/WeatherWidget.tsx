import React from 'react';

export const WeatherWidget: React.FC = () => {
  // Mock weather data - in production, this would come from a weather API
  const weatherData = {
    current: {
      temp: 28,
      condition: 'sunny',
      humidity: 65,
      windSpeed: 12,
      uvIndex: 7
    },
    forecast: [
      { day: '오늘', high: 30, low: 22, condition: 'sunny' },
      { day: '내일', high: 28, low: 20, condition: 'partly_cloudy' },
      { day: '모레', high: 26, low: 19, condition: 'cloudy' }
    ]
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return '☀️';
      case 'partly_cloudy':
        return '⛅';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'stormy':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  const getWeatherLabel = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return '맑음';
      case 'partly_cloudy':
        return '구름 조금';
      case 'cloudy':
        return '흐림';
      case 'rainy':
        return '비';
      case 'stormy':
        return '폭풍';
      default:
        return '보통';
    }
  };

  const getUVLevel = (index: number) => {
    if (index <= 2) return { level: '낮음', color: 'text-green-600' };
    if (index <= 5) return { level: '보통', color: 'text-yellow-600' };
    if (index <= 7) return { level: '높음', color: 'text-orange-600' };
    if (index <= 10) return { level: '매우 높음', color: 'text-red-600' };
    return { level: '위험', color: 'text-purple-600' };
  };

  const uvLevel = getUVLevel(weatherData.current.uvIndex);

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-sm text-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">오늘의 날씨</h3>
          <span className="text-sm opacity-75">서울</span>
        </div>

        {/* Current Weather */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-5xl">{getWeatherIcon(weatherData.current.condition)}</span>
            <div>
              <p className="text-3xl font-bold">{weatherData.current.temp}°</p>
              <p className="text-sm opacity-90">{getWeatherLabel(weatherData.current.condition)}</p>
            </div>
          </div>
          
          <div className="text-right text-sm">
            <div className="mb-2">
              <span className="opacity-75">습도</span>
              <span className="ml-2 font-medium">{weatherData.current.humidity}%</span>
            </div>
            <div className="mb-2">
              <span className="opacity-75">바람</span>
              <span className="ml-2 font-medium">{weatherData.current.windSpeed}km/h</span>
            </div>
            <div>
              <span className="opacity-75">자외선</span>
              <span className={`ml-2 font-medium ${uvLevel.color}`}>{uvLevel.level}</span>
            </div>
          </div>
        </div>

        {/* Forecast */}
        <div className="border-t border-white/20 pt-4">
          <h4 className="text-sm font-medium mb-3 opacity-90">3일 예보</h4>
          <div className="space-y-2">
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm opacity-90">{day.day}</span>
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getWeatherIcon(day.condition)}</span>
                  <span className="text-sm">
                    <span className="font-medium">{day.high}°</span>
                    <span className="opacity-75 ml-1">/ {day.low}°</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Golf Conditions */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">골프 컨디션:</span>
            <span className="ml-2">
              {weatherData.current.temp >= 20 && weatherData.current.temp <= 28 && weatherData.current.condition !== 'rainy'
                ? '최적 ⛳'
                : weatherData.current.condition === 'rainy'
                ? '권장하지 않음 ❌'
                : '양호 ✅'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};