import * as React from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface DateInputProps extends React.ComponentProps<"input"> {
  className?: string
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, type = "datetime-local", ...props }, ref) => {
    const handleCalendarClick = () => {
      if (ref && 'current' in ref && ref.current) {
        // Try modern showPicker API first
        if (ref.current.showPicker) {
          ref.current.showPicker()
        } else {
          // Fallback: focus and click
          ref.current.focus()
          ref.current.click()
        }
      }
    }

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            // Hide native calendar icon
            "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        <Calendar 
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary cursor-pointer transition-colors z-10" 
          onClick={handleCalendarClick}
        />
      </div>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
