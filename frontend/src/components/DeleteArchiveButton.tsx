import { deleteArchive } from '../api/archive'

interface Props {
  query: object
  onDeleted?: () => void
}

export default function DeleteArchiveButton({ query, onDeleted }: Props) {
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete archive?')) return
    await deleteArchive(query)
    if (onDeleted) onDeleted()
  }

  return (
    <button
      onClick={handleDelete}
      className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 text-sm rounded"
    >
      Delete Archive
    </button>
  )
}
