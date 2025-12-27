'use client';

import Image from "next/image";
import Link from "next/link";
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
    name: "Downtown Recycling Center",
    address: "123 Main St, Downtown",
    distance: "0.8 km",
    hours: "Mon-Fri: 8AM-6PM",
    phone: "(555) 123-4567",
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: 2,
    name: "Green Valley Collection Point",
    address: "456 Oak Ave, Green Valley",
    distance: "1.2 km",
    hours: "Mon-Sat: 9AM-5PM",
    phone: "(555) 234-5678",
    coordinates: { lat: 40.7589, lng: -73.9851 }
  },
  {
    id: 3,
    name: "EcoHub Central",
    address: "789 Pine Rd, Central District",
    distance: "2.1 km",
    hours: "Tue-Sun: 10AM-4PM",
    phone: "(555) 345-6789",
    coordinates: { lat: 40.7505, lng: -73.9934 }
  },
  {
    id: 4,
    name: "Sustainable Solutions Depot",
    address: "321 Elm St, Riverside",
    distance: "2.8 km",
    hours: "Mon-Fri: 7AM-7PM",
    phone: "(555) 456-7890",
    coordinates: { lat: 40.7282, lng: -73.7949 }
  }
];

export default function LearnMorePage() {
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
          {/* Mock Map */}
          <div className="map-container">
            <div className="mock-map">
              <div className="map-placeholder">
                <div className="map-icon">🗺️</div>
                <p>Interactive Map View</p>
                <small>Collection centres shown as markers</small>
              </div>

              {/* Mock markers */}
              {collectionCenters.map((center) => (
                <div
                  key={center.id}
                  className="map-marker"
                  style={{
                    left: `${20 + (center.id - 1) * 25}%`,
                    top: `${20 + (center.id - 1) * 20}%`
                  }}
                  title={center.name}
                >
                  📍
                </div>
              ))}
            </div>
          </div>

          {/* Centres List */}
          <div className="centres-list">
            <h3>Nearby Collection Centres</h3>
            <div className="centres-grid">
              {collectionCenters.map((center) => (
                <div key={center.id} className="centre-card">
                  <div className="centre-header">
                    <div className="centre-icon">🏭</div>
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
                  <button className="btn primary small">Get Directions</button>
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