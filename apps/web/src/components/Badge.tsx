import React from 'react';
import { ORDER_STATUS_META, DELIVERY_STATUS_META, USER_ROLE_META } from '@nirware/ui';
import { OrderStatus, DeliveryStatus, UserRole } from '@nirware/config';

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const meta = ORDER_STATUS_META[status] || { label: status, badgeClass: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
};

export const DeliveryStatusBadge: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const meta = DELIVERY_STATUS_META[status] || { label: status, badgeClass: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
};

export const UserRoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const meta = USER_ROLE_META[role] || { label: role, badgeClass: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
};
