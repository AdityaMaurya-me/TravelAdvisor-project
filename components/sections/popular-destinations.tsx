'use client'

import { DestinationCard } from '../cards/destination-card'

const destinations = [
  {
    id: '1',
    name: 'Switzerland',
    title: 'Switzerland',
    location: 'Swiss Alps',
    reviewCount: 582,
    image: '/attraction-1.png',
    description: 'Experience pristine alpine landscapes with charming villages, world-class skiing, and stunning mountain views. Perfect for adventure seekers and nature lovers.',
    rating: 4.8,
    href: '/destinations/switzerland',
  },
  {
    id: '2',
    name: 'Japan',
    title: 'Japan',
    location: 'Tokyo, Kyoto',
    reviewCount: 694,
    image: '/attraction-2.png',
    description: 'Discover the perfect blend of ancient traditions and modern technology. From serene temples to bustling cities, Japan offers unforgettable experiences.',
    rating: 4.9,
    href: '/destinations/japan',
  },
  {
    id: '3',
    name: 'Bali',
    title: 'Bali',
    location: 'Indonesia',
    reviewCount: 511,
    image: '/attraction-3.png',
    description: 'Find paradise in tropical Bali with pristine beaches, lush rice terraces, and vibrant culture. An ideal destination for relaxation and exploration.',
    rating: 4.7,
    href: '/destinations/bali',
  },
  {
    id: '4',
    name: 'Paris',
    title: 'Paris',
    location: 'France',
    reviewCount: 623,
    image: '/attraction-4.png',
    description: 'The City of Light beckons with iconic landmarks, world-class museums, and romantic ambiance. Perfect for culture, cuisine, and unforgettable memories.',
    rating: 4.8,
    href: '/destinations/paris',
  },
  {
    id: '5',
    name: 'Iceland',
    title: 'Iceland',
    location: 'Reykjavik',
    reviewCount: 448,
    image: '/attraction-1.png',
    description: 'Witness dramatic waterfalls, glaciers, and the Northern Lights in this Nordic wonderland. An adventure destination for those seeking natural beauty.',
    rating: 4.6,
    href: '/destinations/iceland',
  },
]

export default function PopularDestinations() {
  return (
    <div className="w-full">
      {/* Header with View All Link */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white">
          Popular Destinations
        </h2>
        <button className="travel-view-all text-cyan-400 hover:text-cyan-100 transition-colors text-sm font-medium">
          View all
        </button>
      </div>

      {/* Scrollable Destinations Container */}
      <div className="overflow-x-auto pb-4 -mx-8 px-8 relative z-0">
        <div className="flex gap-4 min-w-min">
          {destinations.map((destination) => (
            <DestinationCard
              destination={destination}
              key={destination.id}
              {...destination}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
