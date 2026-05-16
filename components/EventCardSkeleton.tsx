export default function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="skeleton h-28 w-full rounded-none" />
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="skeleton h-4 w-16 rounded-full" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    </div>
  )
}
