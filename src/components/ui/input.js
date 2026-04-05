import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
export const Input = React.forwardRef(({ className = "", ...props }, ref) => {
    return _jsx("input", { ref: ref, className: className, ...props });
});
Input.displayName = "Input";
