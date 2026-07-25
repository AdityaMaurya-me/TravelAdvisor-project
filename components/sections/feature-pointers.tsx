'use client'

import { Map, MapPin, Calendar, Heart } from 'lucide-react'

const features = [
  {
    id: 1,
    icon: Map,
    title: 'Explore Places',
    description: 'Discover amazing destinations'
  },
  {
    id: 2,
    icon: MapPin,
    title: 'Top Attractions',
    description: 'Find the best spots to visit'
  },
  {
    id: 3,
    icon: Calendar,
    title: 'Plan Your Trip',
    description: 'Schedule your adventure'
  },
  {
    id: 4,
    icon: Heart,
    title: 'Save & Collect',
    description: 'Bookmark your favorites'
  }
]

export default function FeaturePointers() {
  return (
    <div className="flex gap-6 lg:gap-8 w-full">
      {features.map(({ id, icon: Icon, title, description }) => (
        <div key={id} className="flex items-center gap-4 group cursor-pointer flex-1">
          <div className="shrink-0 w-16 h-16 flex items-center justify-center bg-cyan-500/20 rounded-full group-hover:bg-cyan-500/40 transition-colors">
            <Icon className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">{title}</h3>
            <p className="text-sm lg:text-base text-gray-400 group-hover:text-gray-300 transition-colors leading-tight">{description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
