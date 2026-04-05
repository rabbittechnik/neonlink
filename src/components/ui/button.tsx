import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", type = "button", ...props }, ref) => {
    const variantClass = variant === "ghost" ? "bg-transparent border-none" : "";
    return (
      <button
        ref={ref}
        type={type}
        className={`${variantClass} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
