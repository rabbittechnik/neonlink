import { jsx as _jsx } from "react/jsx-runtime";
export function Card({ className = "", ...props }) {
    return _jsx("div", { className: className, ...props });
}
export function CardHeader({ className = "", ...props }) {
    return _jsx("div", { className: className, ...props });
}
export function CardTitle({ className = "", ...props }) {
    return _jsx("h3", { className: className, ...props });
}
export function CardContent({ className = "", ...props }) {
    return _jsx("div", { className: className, ...props });
}
