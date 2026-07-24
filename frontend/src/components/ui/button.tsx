/* oxlint-disable react/only-export-components */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/20',
  {
    variants: {
      variant: {
        default: 'bg-[#C62828] text-white shadow-soft hover:bg-[#B71C1C] hover:shadow-panel',
        outline: 'border border-[#C62828]/20 bg-white text-[#C62828] hover:border-[#C62828]/35 hover:bg-[#FDF2F2]',
        ghost: 'text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#8E0000]',
        secondary: 'bg-[#F5F5F5] text-[#6B7280] hover:bg-[#ECECEC] hover:text-[#8E0000]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3.5',
        lg: 'h-11 rounded-2xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
