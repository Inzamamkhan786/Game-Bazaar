export const GameCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
    <div className="skeleton h-52 w-full" />
    <div className="p-4">
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-3 w-1/2 mb-4" />
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <div className="skeleton h-4 w-24 mb-3" />
    <div className="skeleton h-8 w-32" />
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="skeleton h-4 w-full" />
      </td>
    ))}
  </tr>
);

const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export default Skeleton;
