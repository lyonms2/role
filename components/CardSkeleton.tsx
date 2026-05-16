export default function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full rounded-none" />
      <div className="p-4 flex flex-col gap-2.5">
        {/* badges */}
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        {/* title */}
        <div className="skeleton h-5 w-3/4" />
        {/* subtitle */}
        <div className="skeleton h-4 w-1/2" />
        {/* distance + weather row */}
        <div className="flex gap-3 mt-1">
          <div className="skeleton h-4 w-16 rounded-full" />
          <div className="skeleton h-4 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}
