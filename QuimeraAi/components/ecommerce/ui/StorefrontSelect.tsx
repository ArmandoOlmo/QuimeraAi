import * as React from 'react';

export type StorefrontSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const StorefrontSelect = React.forwardRef<HTMLSelectElement, StorefrontSelectProps>(
    ({ children, ...props }, ref) => (
        <select ref={ref} {...props}>
            {children}
        </select>
    ),
);

StorefrontSelect.displayName = 'StorefrontSelect';

export default StorefrontSelect;
