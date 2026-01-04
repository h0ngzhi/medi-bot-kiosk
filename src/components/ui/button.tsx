import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-2xl text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Senior-friendly large variants
        menu: "bg-card text-card-foreground border-2 border-border hover:border-primary hover:bg-accent shadow-soft hover:shadow-medium hover:-translate-y-1 justify-start text-left",
        language: "bg-card text-card-foreground border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground shadow-soft hover:shadow-medium hover:-translate-y-1 flex-col gap-2",
        accessibility: "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border",
        accessibilityActive: "bg-primary text-primary-foreground hover:bg-primary/90",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft",
        warm: "bg-gradient-to-r from-secondary to-orange-500 text-secondary-foreground hover:opacity-90 shadow-soft hover:shadow-medium",
      },
      size: {
        default: "h-14 px-6 py-3",
        sm: "h-10 rounded-xl px-4 text-base",
        lg: "h-16 rounded-2xl px-8 text-xl",
        xl: "h-20 rounded-3xl px-10 text-2xl",
        icon: "h-12 w-12",
        menu: "min-h-[100px] p-6 rounded-3xl",
        language: "min-h-[120px] p-8 rounded-3xl",
        accessibility: "h-16 px-6 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
