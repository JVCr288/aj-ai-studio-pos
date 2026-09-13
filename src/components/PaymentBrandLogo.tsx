import React from 'react';
import { getPaymentBrand } from '../utils/paymentBrands';

export interface PaymentBrandLogoProps {
  gateway: string | undefined;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}

export const PaymentBrandLogo: React.FC<PaymentBrandLogoProps> = ({
  gateway,
  size = 'md',
  showName = false,
  className = '',
  nameClassName = '',
}) => {
  const brand = getPaymentBrand(gateway);

  // Size styling for the neutral container
  const containerSizeClasses = {
    sm: 'h-5 px-1 rounded-[4px] border border-zinc-200/90 shadow-xs',
    md: 'h-7 px-1.5 rounded-md border border-zinc-200/90 shadow-sm',
    lg: 'h-9 px-2.5 rounded-lg border border-zinc-200/90 shadow-sm',
  }[size];

  // Size styling for the inner logo image preserving aspect ratio
  const imageSizeClasses = {
    sm: brand.aspectRatio === 'square' ? 'h-3.5 w-3.5' : 'h-2.5 max-w-[46px]',
    md: brand.aspectRatio === 'square' ? 'h-5 w-5' : 'h-3.5 max-w-[72px]',
    lg: brand.aspectRatio === 'square' ? 'h-6 w-6' : 'h-5 max-w-[100px]',
  }[size];

  const defaultNameClasses = {
    sm: 'font-ui text-xs font-semibold text-[#F1F5F9] truncate',
    md: 'font-ui text-xs font-semibold text-[#F1F5F9] tracking-normal truncate',
    lg: 'font-ui text-sm font-semibold text-[#F1F5F9] tracking-normal truncate',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Neutral Brand Artwork Container */}
      <div
        className={`bg-white inline-flex items-center justify-center shrink-0 transition-opacity select-none ${containerSizeClasses}`}
        title={brand.displayName}
      >
        <img
          src={brand.logo}
          alt={brand.altText}
          className={`${imageSizeClasses} object-contain`}
          loading="eager"
        />
      </div>

      {/* Optional Brand Name */}
      {showName && (
        <span className={nameClassName || defaultNameClasses}>
          {brand.displayName}
        </span>
      )}
    </div>
  );
};
