import React, { useEffect, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Truck, Clock, Navigation } from 'lucide-react';
import { motion } from 'motion/react';

interface ActiveShipmentTrackerProps {
  origin: [number, number];
  destination: [number, number];
  orderId: string;
}

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function ActiveShipmentTracker({ origin, destination, orderId }: ActiveShipmentTrackerProps) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <ETAContent origin={origin} destination={destination} />
    </APIProvider>
  );
}

function ETAContent({ origin, destination }: { origin: [number, number], destination: [number, number] }) {
  const routesLibrary = useMapsLibrary('routes');
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  useEffect(() => {
    if (!routesLibrary) return;

    const service = new google.maps.DirectionsService();
    service.route({
      origin: { lat: origin[0], lng: origin[1] },
      destination: { lat: destination[0], lng: destination[1] },
      travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
      if (status === 'OK' && response && response.routes.length > 0) {
        const route = response.routes[0];
        const leg = route.legs[0];
        if (leg) {
          setEta(leg.duration?.text || null);
          setDistance(leg.distance?.text || null);
        }
      } else {
        console.warn("Directions request failed for ETA tracking", status);
        // Fallback for demo if API fails
        setEta("~45 mins");
        setDistance("~25 km");
      }
    });
  }, [routesLibrary, origin, destination]);

  if (!eta) return (
    <div className="flex items-center gap-2 text-slate-500 animate-pulse">
      <Clock size={14} />
      <span className="text-[10px] font-bold uppercase tracking-widest">Calculating ETA...</span>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 text-emerald-main">
        <Clock size={14} strokeWidth={2.5} />
        <span className="text-xs font-black uppercase tracking-widest">ETA: {eta}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <Navigation size={12} />
        <span className="text-[10px] font-bold tracking-tight">{distance} to Wholesale Hub</span>
      </div>
    </motion.div>
  );
}
