import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { IBGECity } from "@/lib/ibge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CityComboboxProps = {
  cities: IBGECity[];
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  className?: string;
};

export function CityCombobox({ cities, value, onChange, disabled = false, className }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-label="Buscar cidade"
        aria-expanded={open}
        disabled={disabled}
        className={cn("w-full min-w-0 justify-between bg-transparent px-3 font-normal", !value && "text-muted-foreground", className)}
      >
        <span className="truncate">{value || (disabled ? "Escolha o estado" : "Digite a cidade")}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
      <Command>
        <CommandInput placeholder="Digite as primeiras letras..." inputMode="search" />
        <CommandList className="max-h-64">
          <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
          <CommandGroup heading="Cidades">
            {cities.map(city => <CommandItem
              key={city.id}
              value={city.nome}
              onSelect={() => {
                onChange(city.nome);
                setOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", value === city.nome ? "opacity-100" : "opacity-0")} aria-hidden="true" />
              {city.nome}
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
