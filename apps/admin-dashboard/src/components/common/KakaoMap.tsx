import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        InfoWindow: new (options: { content: string }) => { open: (map: unknown, marker: unknown) => void };
      };
    };
  }
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

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const container = mapRef.current;
      if (!container) return;

      const position = new window.kakao.maps.LatLng(latitude, longitude);
      const map = new window.kakao.maps.Map(container, {
        center: position,
        level: 4,
      });

      const marker = new window.kakao.maps.Marker({
        map,
        position,
      });

      if (clubName) {
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:13px;color:#333;">${clubName}</div>`,
        });
        infoWindow.open(map, marker);
      }
    });
  }, [latitude, longitude, clubName]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height }}
    />
  );
};
