'use client'

import { useRouter } from 'next/navigation'

const searches = ['Bali', 'Milan', 'Paris', 'Switzerland', 'Iceland']

export default function PopularSearches() {
  const router = useRouter()

  const handleSearch = (location: string) => {
    router.push(`/search/${location}`)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {searches.map((search) => (
        <button
          key={search}
          onClick={() => handleSearch(search)}
          className="px-4 py-2 rounded-full bg-gray-700/40 text-gray-200 border border-gray-600 hover:bg-cyan-400 hover:text-gray-900 hover:border-cyan-400 transition-all duration-300 font-medium text-sm whitespace-nowrap"
        >
          {search}
        </button>
      ))}
    </div>
  )
}
