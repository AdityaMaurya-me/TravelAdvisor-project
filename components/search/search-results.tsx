'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import AttractionCard from '../cards/attraction-card'

interface SearchResultsProps {
  location: string
  onClose: () => void
}

const attractionsData = [
  {
    id: '1',
    image: '/attraction-1.png',
    title: 'Grand Cathedral',
    description: 'Historic landmark in the city center',
    paragraph: 'A stunning architectural masterpiece featuring intricate details and breathtaking interiors. Perfect for photography and understanding the rich cultural heritage of the city.',
  },
  {
    id: '2',
    image: '/attraction-2.png',
    title: 'Mountain Peak Trail',
    description: 'Scenic hiking route with panoramic views',
    paragraph: 'An exhilarating adventure through pristine nature with trail difficulty suitable for all levels. Witness stunning vistas and diverse wildlife throughout your journey.',
  },
  {
    id: '3',
    image: '/attraction-3.png',
    title: 'Local Market Square',
    description: 'Authentic cultural experience and local crafts',
    paragraph: 'Immerse yourself in vibrant local culture with traditional goods, artisan crafts, and authentic cuisine. A true reflection of the city\'s soul and traditions.',
  },
  {
    id: '4',
    image: '/attraction-4.png',
    title: 'Beachfront Resort',
    description: 'Perfect spot for relaxation and water activities',
    paragraph: 'Enjoy pristine sandy beaches with crystal-clear waters ideal for swimming and water sports. Luxury facilities and scenic sunsets await your arrival.',
  },
]

export default function SearchResults({ location, onClose }: SearchResultsProps) {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <div className="w-full py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Heart Button */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex-1">
            {/* Location Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {location}
            </h1>
            
            {/* Description */}
            <p className="text-gray-300 text-lg">
              Explore attractions and travel information for {location}
            </p>
          </div>
          
          {/* Heart Button */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="shrink-0 p-3 rounded-lg bg-gray-900/80 hover:bg-gray-800 transition-colors"
            aria-label="Add to favorites"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
              }`}
            />
          </button>
        </div>

        {/* Nearby Attractions Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Nearby Attractions</h2>
          
          {/* Horizontal Scrolling Attractions */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex gap-4 min-w-min">
              {attractionsData.map((attraction) => (
                <div key={attraction.id} className="shrink-0 w-80">
                  <AttractionCard
                    {...attraction}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
