import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        apikey: string;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          relayout: () => void;
        };
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        InfoWindow: new (options: { content: string }) => { open: (map: unknown, marker: unknown) => void };
        services: {
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (result: Array<{ x: string; y: string; address_name: string }>, status: string) => void,
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function waitForKakaoSdk(): Promise<void> {
  if (window.kakao?.maps?.LatLng) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    let elapsed = 0;
    const interval = 200;
    const maxWait = 5000;

    const timer = setInterval(() => {
      elapsed += interval;
      if (window.kakao?.maps?.LatLng) {
        clearInterval(timer);
        resolve();
      } else if (window.kakao?.maps?.load) {
        clearInterval(timer);
        window.kakao.maps.load(() => resolve());
      } else if (elapsed >= maxWait) {
        clearInterval(timer);
        sdkPromise = null;
        reject(new Error('Kakao SDK load timeout'));
      }
    }, interval);
  });

  return sdkPromise;
}

/** OpenStreetMap iframe fallback */
const OsmFallback: React.FC<{ latitude: number; longitude: number; height: string; clubName?: string }> = ({
  latitude, longitude, height, clubName,
}) => {
  const delta = 0.008;
  const bbox = `${longitude - delta},${latitude - delta / 2},${longitude + delta},${latitude + delta / 2}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      <iframe
        title={clubName || '지도'}
        src={src}
        className="w-full h-full border-0"
        loading="lazy"
      />
      <div className="absolute bottom-2 right-2 flex gap-2">
        <a
          href={`https://map.kakao.com/link/map/${encodeURIComponent(clubName || '위치')},${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-[10px] bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
        >
          카카오맵
        </a>
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-[10px] bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
        >
          크게 보기
        </a>
      </div>
    </div>
  );
};

interface KakaoMapProps {
  latitude: number;
  longitude: number;
  clubName?: string;
  height?: string;
}

export const KakaoMap: React.FC<KakaoMapProps> = ({
  latitude,
  longitude,
  clubName,
  height = '280px',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ relayout: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'kakao' | 'fallback'>('loading');

  // SDK 로딩
  useEffect(() => {
    let cancelled = false;
    waitForKakaoSdk()
      .then(() => { if (!cancelled) setStatus('kakao'); })
      .catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; };
  }, []);

  // Kakao 지도 생성
  useEffect(() => {
    if (status !== 'kakao') return;
    const container = mapRef.current;
    if (!container || !window.kakao?.maps?.LatLng) return;
    if (mapInstanceRef.current) return;

    const position = new window.kakao.maps.LatLng(latitude, longitude);
    const map = new window.kakao.maps.Map(container, {
      center: position,
      level: 4,
    });
    mapInstanceRef.current = map;

    const marker = new window.kakao.maps.Marker({ map, position });

    if (clubName) {
      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:13px;color:#333;">${clubName}</div>`,
      });
      infoWindow.open(map, marker);
    }

    setTimeout(() => map.relayout(), 200);
  }, [status, latitude, longitude, clubName]);

  // Fallback: OpenStreetMap
  if (status === 'fallback') {
    return <OsmFallback latitude={latitude} longitude={longitude} height={height} clubName={clubName} />;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      {status === 'loading' && (
        <div className="absolute inset-0 rounded-lg bg-white/5 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white/40">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/40" />
            <span className="text-sm">지도 로딩 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};
