import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
export const Button = React.forwardRef(({ className = "", variant = "default", type = "button", ...props }, ref) => {
    const variantClass = variant === "ghost" ? "bg-transparent border-none" : "";
    return (_jsx("button", { ref: ref, type: type, className: `${variantClass} ${className}`.trim(), ...props }));
});
Button.displayName = "Button";
