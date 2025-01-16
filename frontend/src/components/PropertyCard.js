export default function PropertyCard({ property, onEdit, onDelete }) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="aspect-w-16 aspect-h-9">
          <img
            src={property.image_url || '/placeholder.jpg'}
            alt={property.title || 'Property Image'}
            className="object-cover w-full h-48"
            onError={(e) => {
              e.target.src = '/placeholder.jpg'
              e.target.onerror = null
            }}
          />
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
            {property.title || 'Untitled Property'}
          </h3>
          <p className="text-gray-600">{property.location || 'Location not available'}</p>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xl font-bold text-blue-600">
              {property.price || 'Price not available'}
            </span>
            <span className={`px-2 py-1 rounded text-sm ${
              property.status === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {property.status}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Listed: {new Date(property.created_at).toLocaleDateString()}
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }