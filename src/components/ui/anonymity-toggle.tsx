import { UserX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AnonymityToggleProps {
  active: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export function AnonymityToggle({ active, onChange, className }: AnonymityToggleProps) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3.5 flex items-center gap-3 transition-all border cursor-pointer",
        active ? "bg-ink border-ink text-paper" : "bg-transparent border-hairline text-ink",
        className,
      )}
      onClick={() => onChange(!active)}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          active ? "bg-paper/15" : "bg-hairline",
        )}
      >
        <UserX size={15} className={active ? "text-paper" : "text-ink-soft"} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Enviar como anônimo</p>
        <p className={cn("text-xs mt-0.5", active ? "text-paper/65" : "text-ink-soft")}>
          Seu nome e foto ficam ocultos.
        </p>
      </div>
      <Switch
        checked={active}
        onCheckedChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
