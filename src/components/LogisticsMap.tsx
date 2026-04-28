import React, { useEffect, useState, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  useMapsLibrary,
  useMap
} from '@vis.gl/react-google-maps';
import { Leaf, Store, Info, Navigation2, Truck } from 'lucide-react';
import { Order } from '../types';

interface LogisticsMapProps {
  farmerCoords: [number, number];
  wholesalerCoords: [number, number];
  isPickedUp: boolean;
  showDirections?: boolean;
  activeOrders?: Order[];
}

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function LogisticsMap({ farmerCoords, wholesalerCoords, isPickedUp, showDirections, activeOrders }: LogisticsMapProps) {
  const [farmerLat, farmerLng] = farmerCoords;
  const [wholesalerLat, wholesalerLng] = wholesalerCoords;
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [farmerRef, farmerMarker] = useAdvancedMarkerRef();
  const [wholesalerRef, wholesalerMarker] = useAdvancedMarkerRef();
  const [openInfoWindow, setOpenInfoWindow] = useState<'farmer' | 'wholesaler' | string | null>(null);

  // Simulated live positions for tracking
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    if (!activeOrders || activeOrders.length === 0) return;

    const interval = setInterval(() => {
      setSimulatedPositions(prev => {
        const next = { ...prev };
        activeOrders.forEach(order => {
          if (order.status !== 'shipped') return;
          
          const start = order.farmerCoords || [farmerLat, farmerLng];
          const end = order.wholesalerCoords || [wholesalerLat, wholesalerLng];
          
          // Progress based on current time
          const duration = 1000 * 60 * 60 * 2; // Assume 2 hour transit for demo
          const elapsed = (Date.now() - (order.dispatchTime || Date.now())) % duration;
          const progress = elapsed / duration;

          next[order.id] = {
            lat: start[0] + (end[0] - start[0]) * progress,
            lng: start[1] + (end[1] - start[1]) * progress
          };
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeOrders, farmerLat, farmerLng, wholesalerLat, wholesalerLng]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location: ", error);
        }
      );
    }
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-orange-500 mb-4 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <h3 className="text-white font-black uppercase tracking-tighter mb-2">Google Maps Activation Required</h3>
        <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto mb-6">
          Please provide your <code className="text-emerald-main px-1 bg-white/5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in the application settings to enable real-time tracking.
        </p>
      </div>
    );
  }

  const center = userLocation || {
    lat: (farmerLat + wholesalerLat) / 2,
    lng: (farmerLng + wholesalerLng) / 2
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-emerald-main/20 shadow-xl shadow-black/40">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          center={userLocation || center}
          defaultZoom={11}
          gestureHandling={'greedy'}
          zoomControl={true}
          mapId={'bf51a910020fa566'}
          colorScheme='DARK'
        >
          {showDirections ? (
             <Directions origin={{ lat: farmerLat, lng: farmerLng }} destination={{ lat: wholesalerLat, lng: wholesalerLng }} />
          ) : (
            <>
              {userLocation && (
                <AdvancedMarker position={userLocation}>
                  <div className="bg-blue-500 rounded-full p-2 border-2 border-white shadow-lg">
                    <Navigation2 className="w-4 h-4 text-white" />
                  </div>
                </AdvancedMarker>
              )}
              {/* Custom Farmer Marker */}
              <AdvancedMarker 
                ref={farmerRef}
                position={{ lat: farmerLat, lng: farmerLng }}
                onClick={() => setOpenInfoWindow('farmer')}
                className={`transition-all duration-300 ${!isPickedUp ? 'scale-110 z-10' : 'scale-90 opacity-80'}`}
              >
                <div className={`flex flex-col items-center group cursor-pointer ${!isPickedUp ? 'animate-bounce' : ''}`}>
                  <div className="bg-emerald-main rounded-full p-2.5 shadow-[0_0_20px_rgba(16,185,129,0.5)] border-2 border-black relative">
                     <Leaf className="w-5 h-5 text-black" />
                     {!isPickedUp && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                     )}
                  </div>
                  <div className="mt-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-black text-emerald-main uppercase tracking-widest border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Pickup Node
                  </div>
                </div>
              </AdvancedMarker>

              {/* Custom Wholesaler Marker */}
              <AdvancedMarker 
                ref={wholesalerRef}
                position={{ lat: wholesalerLat, lng: wholesalerLng }}
                onClick={() => setOpenInfoWindow('wholesaler')}
                className={`transition-all duration-300 ${isPickedUp ? 'scale-110 z-10' : 'scale-90 opacity-80'}`}
              >
                <div className={`flex flex-col items-center group cursor-pointer ${isPickedUp ? 'animate-bounce' : ''}`}>
                  <div className="bg-indigo-500 text-white rounded-full p-2.5 shadow-[0_0_20px_rgba(99,102,241,0.5)] border-2 border-black relative">
                     <Store className="w-5 h-5" />
                     {isPickedUp && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                     )}
                  </div>
                  <div className="mt-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Drop Node
                  </div>
                </div>
              </AdvancedMarker>

              {/* Farmer InfoWindow */}
              {openInfoWindow === 'farmer' && (
                <InfoWindow
                  anchor={farmerMarker}
                  onCloseClick={() => setOpenInfoWindow(null)}
                  className="custom-info-window"
                >
                  <div className="bg-white p-3 rounded-lg max-w-[200px] text-gray-800 font-sans shadow-lg">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                      <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-700">
                        <Leaf size={16} />
                      </div>
                      <h4 className="font-bold text-sm tracking-tight m-0">Farm Location (Origin)</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2 m-0">
                      Current Status: <strong className={!isPickedUp ? "text-emerald-600" : "text-gray-500"}>
                        {!isPickedUp ? "Awaiting Pickup" : "Picked Up"}
                      </strong>
                    </p>
                    <button className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded flex items-center justify-center gap-1 transition-colors">
                      <Navigation2 size={12} /> Open in Maps
                    </button>
                  </div>
                </InfoWindow>
              )}

              {/* Wholesaler InfoWindow */}
              {openInfoWindow === 'wholesaler' && (
                <InfoWindow
                  anchor={wholesalerMarker}
                  onCloseClick={() => setOpenInfoWindow(null)}
                  className="custom-info-window"
                >
                  <div className="bg-white p-3 rounded-lg max-w-[200px] text-gray-800 font-sans shadow-lg">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                      <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-700">
                        <Store size={16} />
                      </div>
                      <h4 className="font-bold text-sm tracking-tight m-0">Wholesale Center (Dest)</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2 m-0">
                      Expected Arrival: <strong className="text-indigo-600">~45 mins</strong>
                    </p>
                    <button className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded flex items-center justify-center gap-1 transition-colors">
                      <Info size={12} /> View Details
                    </button>
                  </div>
                </InfoWindow>
              )}

              {/* Active Delivery Trucks */}
              {activeOrders?.filter(o => o.status === 'shipped').map(order => (
                simulatedPositions[order.id] && (
                  <AdvancedMarker 
                    key={order.id}
                    position={simulatedPositions[order.id]}
                    onClick={() => setOpenInfoWindow(order.id)}
                  >
                    <div className="flex flex-col items-center group cursor-pointer">
                      <div className="bg-amber-500 text-black rounded-full p-2 shadow-xl border-2 border-black animate-pulse">
                         <Truck className="w-5 h-5" />
                      </div>
                      <div className="mt-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-black text-amber-500 uppercase tracking-widest border border-white/10">
                        {order.driverName || 'Truck'}
                      </div>
                    </div>
                  </AdvancedMarker>
                )
              ))}

              {/* Truck InfoWindow */}
              {typeof openInfoWindow === 'string' && openInfoWindow !== 'farmer' && openInfoWindow !== 'wholesaler' && (
                <InfoWindow
                  position={simulatedPositions[openInfoWindow]}
                  onCloseClick={() => setOpenInfoWindow(null)}
                >
                  <div className="bg-white p-3 rounded-xl min-w-[180px] text-slate-800">
                     <div className="flex items-center gap-2 mb-2">
                        <Truck size={14} className="text-amber-600" />
                        <h4 className="font-black text-xs uppercase tracking-tight">In Transit</h4>
                     </div>
                     <p className="text-[10px] font-bold text-slate-500 mb-1">Carrier: <span className="text-slate-900">{activeOrders?.find(o => o.id === openInfoWindow)?.driverName}</span></p>
                     <p className="text-[10px] font-bold text-slate-500">Crop: <span className="text-slate-900">{activeOrders?.find(o => o.id === openInfoWindow)?.cropName}</span></p>
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

function Directions({ origin, destination }: { origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => trafficLayer.setMap(null);
  }, [map]);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    const service = new routesLibrary.DirectionsService();
    const renderer = new routesLibrary.DirectionsRenderer({ 
      map,
      panel: panelRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#10b981',
        strokeWeight: 6,
        strokeOpacity: 0.9
      }
    });
    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    }).then((response) => {
      directionsRenderer.setDirections(response);
    }).catch(e => console.error("Directions request failed", e));
  }, [directionsService, directionsRenderer, origin, destination]);

  return null;
}
