const Badge = ({ variant = 'default', children, className = '' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    pending: 'status-pending',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled',
  };

  return (
    <span className={`badge ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const map = {
    PENDING: { variant: 'pending', label: 'Pending Delivery' },
    DELIVERED: { variant: 'delivered', label: 'Delivered' },
    CANCELLED: { variant: 'cancelled', label: 'Cancelled' },
  };
  const config = map[status] || { variant: 'default', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default Badge;
