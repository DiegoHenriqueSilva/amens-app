import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { scheduleDailyPromiseNotification } from "@/lib/notifications";

interface ReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDay: number;
  onConfirm: (time: string) => void;
}

export const ReminderModal = ({ open, onOpenChange, currentDay, onConfirm }: ReminderModalProps) => {
  const [selectedTime, setSelectedTime] = useState("08:00");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const handleConfirm = async () => {
    onConfirm(selectedTime);
    toast.success(`Lembrete agendado para amanhã às ${selectedTime}! 🙏`);
    
    // Na prática integraríamos com o agendamento específico da novena
    // Por enquanto usamos a base que já existe no app
    await scheduleDailyPromiseNotification(); 
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-hairline rounded-xl">
        <DialogHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Bell className="w-6 h-6 text-primary animate-bounce-soft" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Lembrete para Amanhã</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Parabéns por concluir o **Dia {currentDay}**. <br/>
            Que tal agendar um horário para sua oração de amanhã?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 my-6">
          <div className="flex items-center gap-3 bg-secondary/50 p-4 rounded-2xl border border-primary/10">
            <Clock className="w-5 h-5 text-primary" />
            <div className="flex items-center gap-2">
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-[120px] bg-white border-primary/20 rounded-xl">
                  <SelectValue placeholder="Horário" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map(h => 
                    minutes.map(m => (
                      <SelectItem key={`${h}:${m}`} value={`${h}:${m}`}>
                        {h}:{m}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl flex-1">
            Agora não
          </Button>
          <Button onClick={handleConfirm} className="rounded-full flex-1 bg-ink text-paper hover:opacity-90">
            Confirmar Lembrete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
