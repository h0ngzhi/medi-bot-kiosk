import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  "#f59e0b", // Amber
  "#64748b", // Slate
  "#eab308", // Yellow
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#84cc16", // Lime
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            type="button"
          >
            <div
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-mono">{value}</span>
            <Palette className="h-4 w-4 ml-auto text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    value === color ? "border-foreground ring-2 ring-offset-2 ring-primary" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 p-1 cursor-pointer"
              />
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
