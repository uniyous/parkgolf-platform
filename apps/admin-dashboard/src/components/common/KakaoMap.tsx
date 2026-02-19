import React, { useEffect, useRef, useState, useCallback } from 'react';

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

// index.html <script> 태그로 SDK가 로드되기를 기다림
let sdkPromise: Promise<void> | null = null;

function waitForKakaoSdk(): Promise<void> {
  // 이미 완전히 로드됨
  if (window.kakao?.maps?.LatLng) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    // autoload=false 상태: load() 호출
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    // SDK 스크립트가 아직 로드 안 됨 → 폴링으로 대기 (최대 10초)
    let elapsed = 0;
    const interval = 200;
    const maxWait = 10000;

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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const createMap = useCallback(() => {
    const container = mapRef.current;
    if (!container || !window.kakao?.maps?.LatLng) return;

    const position = new window.kakao.maps.LatLng(latitude, longitude);
    const map = new window.kakao.maps.Map(container, {
      center: position,
      level: 4,
    });

    const marker = new window.kakao.maps.Marker({ map, position });

    if (clubName) {
      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:13px;color:#333;">${clubName}</div>`,
      });
      infoWindow.open(map, marker);
    }

    setTimeout(() => map.relayout(), 100);
  }, [latitude, longitude, clubName]);

  // SDK 로딩
  useEffect(() => {
    let cancelled = false;

    waitForKakaoSdk()
      .then(() => { if (!cancelled) setStatus('ready'); })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => { cancelled = true; };
  }, []);

  // SDK 로드 완료 후 지도 생성 (re-render 후 mapRef가 DOM에 있을 때)
  useEffect(() => {
    if (status === 'ready') {
      // requestAnimationFrame으로 DOM 업데이트 보장
      requestAnimationFrame(() => createMap());
    }
  }, [status, createMap]);

  if (status === 'error') {
    return (
      <div
        className="w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3"
        style={{ height }}
      >
        <p className="text-sm text-white/40">지도를 로드할 수 없습니다</p>
        <a
          href={`https://map.kakao.com/link/map/${encodeURIComponent(clubName || '위치')},${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600/80 text-white rounded-md hover:bg-emerald-500 transition-colors"
        >
          카카오맵에서 보기
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        className="w-full rounded-lg overflow-hidden bg-white/5 flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-white/40">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/40" />
          <span className="text-sm">지도 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden bg-white/5"
      style={{ height }}
    />
  );
};
