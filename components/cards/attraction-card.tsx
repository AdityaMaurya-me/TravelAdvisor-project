'use client'

import Image from 'next/image'
import { MapPin } from 'lucide-react'

interface AttractionCardProps {
  id: string
  image: string
  title: string
  description: string
  paragraph?: string
}

export default function AttractionCard({ id, image, title, description, paragraph }: AttractionCardProps) {
  return (
    <div className="flex flex-col gap-3 bg-gray-900/80 rounded-lg overflow-hidden hover:bg-gray-800/80 transition-colors h-full">
      {/* Image */}
      <div className="relative w-full h-40 shrink-0">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 flex flex-col justify-start">
        <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{title}</h3>
        <div className="flex items-start gap-2 text-gray-300 text-xs mb-3">
          <MapPin className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{description}</span>
        </div>
        {paragraph && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
            {paragraph}
          </p>
        )}
      </div>
    </div>
  )
}
