'use client'

import { useState, useEffect } from 'react'
import PropertyCard from '@/components/PropertyCard'
import CreatePropertyForm from '@/components/CreatePropertyForm'
import PropertyDetails from '@/components/PropertyDetails'
import ScrapingForm from '@/components/ScrapingForm'
import PropertyModal from '@/components/PropertyModal'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function Home() {
  // State management
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [scrapingInProgress, setScrapingInProgress] = useState(false)

  const API_BASE_URL = 'http://localhost:8000/api'

  // Fetch properties
  const fetchProperties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }

      const data = await response.json()
      setProperties(data.properties || [])
    } catch (error) {
      setError(error.message)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Create property
  const handlePropertyCreated = async (newProperty) => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProperty),
      })

      if (!response.ok) {
        throw new Error('Failed to create property')
      }

      const data = await response.json()
      setProperties([...properties, data.property])
      setShowCreateForm(false)
      toast.success('Property created successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Update property
  const updateProperty = async (id, updatedData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        throw new Error('Failed to update property')
      }

      await fetchProperties()
      setIsModalOpen(false)
      setSelectedProperty(null)
      toast.success('Property updated successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Delete property
  const deleteProperty = async (id) => {
    try {
      const confirmDelete = window.confirm('Are you sure you want to delete this property?')
      if (!confirmDelete) return

      const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete property')
      }

      setProperties(properties.filter(p => p.id !== id))
      toast.success('Property deleted successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Scraping functionality
  const startScraping = async (url) => {
    try {
      setScrapingInProgress(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to start scraping')
      }

      const data = await response.json()
      
      if (data.property && data.property.id) {
        await checkStatus(data.property.id)
        toast.success('Scraping started successfully')
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      setError(error.message)
      toast.error(error.message)
      setScrapingInProgress(false)
    }
  }

  // Check scraping status with updated endpoint
  const checkStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/properties/${id}/status`)
      
      if (!response.ok) {
        throw new Error('Failed to check status')
      }

      const data = await response.json()

      if (data.status === 'COMPLETED') {
        await fetchProperties()
        setScrapingInProgress(false)
        toast.success('Scraping completed successfully')
      } else if (data.status === 'FAILED') {
        throw new Error('Scraping failed')
      } else {
        setTimeout(() => checkStatus(id), 2000)
      }
    } catch (error) {
      setError(error.message)
      toast.error(error.message)
      setScrapingInProgress(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchProperties()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            {showCreateForm ? 'Hide Form' : 'Add Property'}
          </button>
        </div>

        {/* Create Property Form */}
        {showCreateForm && (
          <CreatePropertyForm onPropertyCreated={handlePropertyCreated} />
        )}

        {/* Scraping Form */}
        <ScrapingForm onSubmit={startScraping} loading={scrapingInProgress} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties && properties.length > 0 ? (
            properties.map((property) => (
              <PropertyCard 
                key={property.id} 
                property={property}
                onView={() => setSelectedPropertyId(property.id)}
                onEdit={() => {
                  setSelectedProperty(property)
                  setIsModalOpen(true)
                }}
                onDelete={() => deleteProperty(property.id)}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-8">
              No properties found
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {scrapingInProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-center">Scraping properties...</p>
            </div>
          </div>
        )}

        {/* Property Details Modal */}
        {selectedPropertyId && (
          <PropertyDetails
            propertyId={selectedPropertyId}
            onClose={() => setSelectedPropertyId(null)}
          />
        )}

        {/* Edit Property Modal */}
        {selectedProperty && (
          <PropertyModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedProperty(null)
            }}
            property={selectedProperty}
            onSave={updateProperty}
          />
        )}

        {/* Toast Container */}
        <ToastContainer position="bottom-right" />
      </div>
    </main>
  )
}
















// 'use client'

// import { useState, useEffect } from 'react'
// import PropertyCard from '../components/PropertyCard'
// import ScrapingForm from '../components/ScrapingForm'

// export default function Home() {
//   const [properties, setProperties] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState(null)

//   const startScraping = async (url) => {
//     try {
//       setLoading(true)
//       setError(null)
      
//       const response = await fetch('http://localhost:8000/api/scrape', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ url }),
//       })

//       if (!response.ok) {
//         throw new Error('Failed to start scraping')
//       }

//       const data = await response.json()
      
//       if (data.property && data.property.id) {
//         await checkStatus(data.property.id)
//       } else {
//         throw new Error('Invalid response format')
//       }
//     } catch (error) {
//       setError(error.message)
//       setLoading(false)
//     }
//   }

//   const checkStatus = async (id) => {
//     try {
//       const response = await fetch(`http://localhost:8000/api/status/${id}`)
      
//       if (!response.ok) {
//         throw new Error('Failed to check status')
//       }

//       const data = await response.json()

//       if (data.status === 'COMPLETED') {
//         await fetchProperties()
//         setLoading(false)
//       } else if (data.status === 'FAILED') {
//         throw new Error('Scraping failed')
//       } else {
//         setTimeout(() => checkStatus(id), 2000)
//       }
//     } catch (error) {
//       setError(error.message)
//       setLoading(false)
//     }
//   }

//   const fetchProperties = async () => {
//     try {
//       const response = await fetch('http://localhost:8000/api/properties')
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch properties')
//       }

//       const data = await response.json()
//       setProperties(data.properties || [])
//     } catch (error) {
//       setError(error.message)
//     }
//   }

//   useEffect(() => {
//     fetchProperties()
//   }, [])

//   return (
//     <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//       <div className="space-y-8">
//         <ScrapingForm onSubmit={startScraping} loading={loading} />
        
//         {error && (
//           <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
//             {error}
//           </div>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {properties && properties.length > 0 ? (
//             properties.map((property) => (
//               <PropertyCard key={property.id} property={property} />
//             ))
//           ) : (
//             <div className="col-span-full text-center text-gray-500">
//               No properties found
//             </div>
//           )}
//         </div>

//         {loading && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
//             <div className="bg-white p-6 rounded-lg shadow-xl">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//               <p className="mt-4 text-center">Scraping properties...</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </main>
//   )
// }