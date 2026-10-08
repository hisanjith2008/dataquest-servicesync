import React from 'react';
import { UserRole } from '../../types';

interface StandardAvatarProps {
  name: string;
  role?: UserRole | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate consistent initials from full name (e.g. Rajesh Sharma -> RS)
export const getInitials = (name: string): string => {
  if (!name) return 'SS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Deterministic clean background color based on name/role
export const getRoleBgColor = (role?: string) => {
  switch (role) {
    case 'Admin':
      return 'bg-indigo-600 text-white ring-indigo-200';
    case 'Technician':
      return 'bg-emerald-600 text-white ring-emerald-200';
    case 'Customer':
      return 'bg-blue-600 text-white ring-blue-200';
    default:
      return 'bg-slate-700 text-white ring-slate-200';
  }
};

export const StandardAvatar: React.FC<StandardAvatarProps> = ({
  name,
  role,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(name);
  const colorClass = getRoleBgColor(role);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base font-bold',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl font-bold font-mono tracking-wider select-none shrink-0 ring-1 shadow-2xs ${sizeClasses} ${colorClass} ${className}`}
      aria-label={`${name} (${role || 'User'})`}
      title={`${name} · ${role || 'User'}`}
    >
      {initials}
    </div>
  );
};

// Standard Identity for Technicians (Consistent across every job/view)
interface TechnicianIdentityProps {
  name: string;
  technicianId?: string;
  showIdOnly?: boolean;
  status?: string;
  className?: string;
}

export const TechnicianIdentity: React.FC<TechnicianIdentityProps> = ({
  name,
  technicianId,
  showIdOnly = false,
  status,
  className = '',
}) => {
  const displayId = technicianId ? technicianId.toUpperCase() : 'TECH';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <StandardAvatar name={name} role="Technician" size="md" />
      <div className="min-w-0 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Technician
        </div>
        <div className="font-bold text-slate-900 text-xs truncate leading-snug">
          {name}
        </div>
        <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5">
          Technician ID: <span className="font-semibold text-slate-700">{displayId}</span>
          {status && (
            <span className="ml-1.5 font-sans font-medium text-[10px] text-emerald-600">
              · {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Standard Identity for Customers (Consistent across every job/view)
interface CustomerIdentityProps {
  name: string;
  customerId?: string;
  siteName?: string;
  className?: string;
}

export const CustomerIdentity: React.FC<CustomerIdentityProps> = ({
  name,
  customerId,
  siteName,
  className = '',
}) => {
  const displayId = customerId ? customerId.toUpperCase() : 'CUST';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <StandardAvatar name={name} role="Customer" size="md" />
      <div className="min-w-0 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
          Customer
        </div>
        <div className="font-bold text-slate-900 text-xs truncate leading-snug">
          {name}
        </div>
        <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5">
          Customer ID: <span className="font-semibold text-slate-700">{displayId}</span>
          {siteName && (
            <span className="ml-1.5 font-sans text-slate-500">
              · {siteName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Standard Identity for Admins
interface AdminIdentityProps {
  name: string;
  adminId?: string;
  designation?: string;
  className?: string;
}

export const AdminIdentity: React.FC<AdminIdentityProps> = ({
  name,
  adminId,
  designation,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <StandardAvatar name={name} role="Admin" size="md" />
      <div className="min-w-0 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          Admin
        </div>
        <div className="font-bold text-slate-900 text-xs truncate leading-snug">
          {name}
        </div>
        {adminId && (
          <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5">
            Admin ID: <span className="font-semibold text-slate-700">{adminId.toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
