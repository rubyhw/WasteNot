'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from 'react';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';

const recyclingGuides = [
  {
    title: "Plastic Recycling Guide",
    description: "Learn how to properly sort and prepare plastic items for recycling",
    icon: "♻️",
    tips: [
      "Rinse containers to remove food residue",
      "Check recycling symbols (1-7) on plastics",
      "Remove caps and lids before recycling",
      "Flatten plastic bottles to save space"
    ]
  },
  {
    title: "Paper & Cardboard",
    description: "Everything you need to know about recycling paper products",
    icon: "📄",
    tips: [
      "Keep paper clean and dry",
      "Remove staples and paper clips",
      "Shred sensitive documents before recycling",
      "Flatten cardboard boxes for collection"
    ]
  },
  {
    title: "Glass Recycling",
    description: "Handle glass items safely and effectively",
    icon: "🥤",
    tips: [
      "Separate by color when possible",
      "Rinse containers thoroughly",
      "Remove metal lids and caps",
      "Wrap broken glass in paper before disposal"
    ]
  },
  {
    title: "Metal Recycling",
    description: "Tips for recycling cans, foil, and other metal items",
    icon: "🥫",
    tips: [
      "Rinse cans to remove residue",
      "Crush aluminum cans to save space",
      "Remove paper labels when possible",
      "Keep different metals separate"
    ]
  }
];

const environmentalFacts = [
  {
    fact: "Recycling one ton of plastic saves enough energy to power a home for 2-3 months",
    icon: "⚡"
  },
  {
    fact: "The average person generates about 4.4 pounds of waste per day",
    icon: "📊"
  },
  {
    fact: "Recycling aluminum cans saves 95% of the energy needed to make new aluminum",
    icon: "🔄"
  },
  {
    fact: "Paper recycling reduces greenhouse gas emissions by up to 73%",
    icon: "🌱"
  }
];

const collectionCenters = [
  {
    id: 1,
    name: "George Town Recycling Center",
    address: "Jalan Penang, George Town, 10200 Penang",
    distance: "0.8 km",
    hours: "Mon-Fri: 8AM-6PM",
    phone: "+604-261-1234",
    coordinates: { lat: 5.4141, lng: 100.3288 }
  },
  {
    id: 2,
    name: "Bayan Lepas Eco Collection Point",
    address: "Jalan Bayan Lepas, Bayan Lepas, 11900 Penang",
    distance: "1.2 km",
    hours: "Mon-Sat: 9AM-5PM",
    phone: "+604-642-5678",
    coordinates: { lat: 5.2897, lng: 100.2631 }
  },
  {
    id: 3,
    name: "Butterworth Green Hub",
    address: "Jalan Bagan Luar, Butterworth, 12000 Penang",
    distance: "2.1 km",
    hours: "Tue-Sun: 10AM-4PM",
    phone: "+604-331-9012",
    coordinates: { lat: 5.4380, lng: 100.3885 }
  },
  {
    id: 4,
    name: "Jelutong Sustainable Solutions",
    address: "Jalan Jelutong, Jelutong, 11600 Penang",
    distance: "2.8 km",
    hours: "Mon-Fri: 7AM-7PM",
    phone: "+604-456-7890",
    coordinates: { lat: 5.3971, lng: 100.3188 }
  }
];

function MapComponent({ centers, selectedCenter, onCenterSelect }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowsRef = useRef([]);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        initMap();
      };
    } else if (window.google) {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || !window.google) return;

      // Center on Penang, Malaysia
      const penangCenter = { lat: 5.4141, lng: 100.3288 };

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 11,
        center: penangCenter,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;

      // Clear existing markers and info windows
      markersRef.current.forEach(marker => marker.setMap(null));
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      markersRef.current = [];
      infoWindowsRef.current = [];

      // Add markers for each center
      centers.forEach((center, index) => {
        const marker = new window.google.maps.Marker({
          position: center.coordinates,
          map: map,
          title: center.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
                <text x="20" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">${index + 1}</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 40)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${center.name}</h3>
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📍 ${center.address}</p>
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">🕒 ${center.hours}</p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📞 ${center.phone}</p>
              <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${center.coordinates.lat},${center.coordinates.lng}', '_blank')"
                      style="background: #10B981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Get Directions
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          // Close other info windows
          infoWindowsRef.current.forEach(iw => iw.close());
          // Open this info window
          infoWindow.open(map, marker);
          // Call the select callback
          onCenterSelect(center);
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
      });

      // Fit map to show all markers
      if (centers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        centers.forEach(center => {
          bounds.extend(center.coordinates);
        });
        map.fitBounds(bounds);

        // Don't zoom in too much for single points
        const listener = window.google.maps.event.addListener(map, 'idle', () => {
          if (map.getZoom() > 15) map.setZoom(15);
          window.google.maps.event.removeListener(listener);
        });
      }
    }

    return () => {
      // Cleanup
      if (markersRef.current) {
        markersRef.current.forEach(marker => marker.setMap(null));
      }
      if (infoWindowsRef.current) {
        infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      }
    };
  }, [centers, onCenterSelect]);

  // Highlight selected center
  useEffect(() => {
    if (selectedCenter && markersRef.current.length > 0) {
      const centerIndex = centers.findIndex(c => c.id === selectedCenter.id);
      if (centerIndex !== -1 && markersRef.current[centerIndex]) {
        // Bounce animation
        markersRef.current[centerIndex].setAnimation(window.google?.maps?.Animation?.BOUNCE);
        setTimeout(() => {
          if (markersRef.current[centerIndex]) {
            markersRef.current[centerIndex].setAnimation(null);
          }
        }, 2000);
      }
    }
  }, [selectedCenter, centers]);

  return (
    <div className="map-container">
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here' ? (
        <div className="map-placeholder">
          <div className="map-icon">🗺️</div>
          <p>Interactive Map View</p>
          <small>To enable the map, add your Google Maps API key to .env.local</small>
          <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
          </code>
        </div>
      ) : (
        <div ref={mapRef} style={{ width: '100%', height: '400px', borderRadius: '12px' }} />
      )}
    </div>
  );
}

export default function LearnMorePage() {
  const [selectedCenter, setSelectedCenter] = useState(null);

  return (
    <main className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="badge">Learn & Recycle</div>
        <h1>Recycling Resources & Guides</h1>
        <p className="lede">
          Discover how-to guides, tips, and best practices to become a recycling expert and make a positive impact on the environment.
        </p>
      </div>

      {/* Recycling Guides Section */}
      <section className="guides-section">
        <h2>How-to Recycling Guides</h2>
        <p className="section-subtitle">
          Master the art of recycling with our comprehensive guides for different materials
        </p>
        <div className="guides-grid">
          {recyclingGuides.map((guide, index) => (
            <div key={index} className="guide-card">
              <div className="guide-header">
                <div className="guide-icon">{guide.icon}</div>
                <h3>{guide.title}</h3>
              </div>
              <p className="guide-description">{guide.description}</p>
              <div className="guide-tips">
                <h4>Key Tips:</h4>
                <ul>
                  {guide.tips.map((tip, tipIndex) => (
                    <li key={tipIndex}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accepted Items Section */}
      <section className="accepted-section">
        <h2>What We Accept</h2>
        <p className="lede">
          WasteNot accepts these recyclable items at our collection centres
        </p>
        <div className="accepted-grid">
          {RECYCLABLE_ITEMS.map((item) => (
            <div key={item.id} className="accepted-card">
              <div className="accepted-icon">
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={48}
                  height={48}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="accepted-info">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Environmental Impact Section */}
      <section className="impact-section">
        <h2>Environmental Impact</h2>
        <p className="section-subtitle">
          See the real difference recycling makes for our planet
        </p>
        <div className="facts-grid">
          {environmentalFacts.map((fact, index) => (
            <div key={index} className="fact-card">
              <div className="fact-icon">{fact.icon}</div>
              <p className="fact-text">{fact.fact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collection Centre Locator */}
      <section className="locator-section">
        <h2>Find Collection Centres Near You</h2>
        <p className="section-subtitle">
          Locate the nearest WasteNot collection centres in your area
        </p>

        <div className="locator-container">
          {/* Interactive Map */}
          <MapComponent
            centers={collectionCenters}
            selectedCenter={selectedCenter}
            onCenterSelect={setSelectedCenter}
          />

          {/* Centres List */}
          <div className="centres-list">
            <h3>Nearby Collection Centres</h3>
            <div className="centres-grid">
              {collectionCenters.map((center) => (
                <div
                  key={center.id}
                  className={`centre-card ${selectedCenter?.id === center.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCenter(center)}
                >
                  <div className="centre-header">
                    <div className="centre-icon">{center.id}</div>
                    <div className="centre-info">
                      <h4>{center.name}</h4>
                      <p className="centre-address">{center.address}</p>
                      <span className="centre-distance">{center.distance} away</span>
                    </div>
                  </div>
                  <div className="centre-details">
                    <div className="centre-detail">
                      <span className="detail-icon">🕒</span>
                      <span>{center.hours}</span>
                    </div>
                    <div className="centre-detail">
                      <span className="detail-icon">📞</span>
                      <span>{center.phone}</span>
                    </div>
                  </div>
                  <button
                    className="btn primary small"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${center.coordinates.lat},${center.coordinates.lng}`, '_blank');
                    }}
                  >
                    Get Directions
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div>
          <p className="badge">Ready to start?</p>
          <h2>Join the recycling movement</h2>
          <p className="lede">
            Create your account today and start earning rewards for your recycling efforts.
          </p>
        </div>
        <div className="cta-actions">
          <Link href="/register">
            <button className="btn primary">Create account</button>
          </Link>
          <Link href="/">
            <button className="btn ghost">Back to home</button>
          </Link>
        </div>
      </section>
    </main>
  );
}