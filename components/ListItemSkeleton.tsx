export default function ListItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white">
      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2 py-0.5">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
      <div className="skeleton w-20 h-8 rounded-xl flex-shrink-0" />
    </div>
  )
}
