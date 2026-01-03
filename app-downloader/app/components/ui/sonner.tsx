"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-blue-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-slate-600" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flex items-start gap-3 w-full p-4 bg-white border border-slate-200 rounded-xl shadow-lg",
          title: "text-sm font-semibold text-slate-900",
          description: "text-sm text-slate-700 mt-1",
          error: "!bg-red-50 !border-red-300",
          success: "!bg-emerald-50 !border-emerald-300",
          warning: "!bg-amber-50 !border-amber-300",
          info: "!bg-blue-50 !border-blue-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
