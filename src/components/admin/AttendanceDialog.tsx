import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Phone, CheckCircle2, Clock, Award } from "lucide-react";
import { format } from "date-fns";

interface Signup {
  id: string;
  kiosk_user_id: string;
  participant_name: string | null;
  phone_number: string | null;
  status: string;
  signed_up_at: string;
  attended_at: string | null;
}

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeId: string;
  programmeTitle: string;
  pointsReward: number;
  onAttendanceMarked: () => void;
}

export const AttendanceDialog = ({
  open,
  onOpenChange,
  programmeId,
  programmeTitle,
  pointsReward,
  onAttendanceMarked,
}: AttendanceDialogProps) => {
  const { toast } = useToast();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSignups();
      setSelectedIds(new Set());
    }
  }, [open, programmeId]);

  const fetchSignups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_programme_signups")
      .select("*")
      .eq("programme_id", programmeId)
      .order("signed_up_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load signups",
        variant: "destructive",
      });
    } else {
      setSignups(data || []);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllPending = () => {
    const pendingIds = signups
      .filter((s) => s.status !== "attended")
      .map((s) => s.id);
    setSelectedIds(new Set(pendingIds));
  };

  const handleMarkAttendance = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select participants to mark attendance",
        variant: "destructive",
      });
      return;
    }

    setMarking(true);

    try {
      // Get the selected signups to find their kiosk_user_ids
      const selectedSignups = signups.filter((s) => selectedIds.has(s.id));
      const kioskUserIds = selectedSignups.map((s) => s.kiosk_user_id);

      // Update signup status to attended
      const { error: updateError } = await supabase
        .from("user_programme_signups")
        .update({
          status: "attended",
          attended_at: new Date().toISOString(),
        })
        .in("id", Array.from(selectedIds));

      if (updateError) throw updateError;

      // Add points to each user
      for (const kioskUserId of kioskUserIds) {
        // Get current points
        const { data: userData, error: fetchError } = await supabase
          .from("kiosk_users")
          .select("points")
          .eq("id", kioskUserId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (userData) {
          const newPoints = (userData.points || 0) + pointsReward;
          const { error: pointsError } = await supabase
            .from("kiosk_users")
            .update({ points: newPoints })
            .eq("id", kioskUserId);

          if (pointsError) throw pointsError;
        }
      }

      toast({
        title: "Success",
        description: `Marked ${selectedIds.size} participant(s) as attended. ${pointsReward} points awarded to each.`,
      });

      setSelectedIds(new Set());
      fetchSignups();
      onAttendanceMarked();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setMarking(false);
    }
  };

  const pendingCount = signups.filter((s) => s.status !== "attended").length;
  const attendedCount = signups.filter((s) => s.status === "attended").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Signups & Attendance
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{programmeTitle}</p>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-warning" />
            <span>{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>{attendedCount} attended</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-primary" />
            <span>{pointsReward} pts/person</span>
          </div>
        </div>

        {/* Signup List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading signups...
            </div>
          ) : signups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No signups yet for this programme
            </div>
          ) : (
            <div className="space-y-2">
              {signups.map((signup) => {
                const isAttended = signup.status === "attended";
                const isSelected = selectedIds.has(signup.id);

                return (
                  <div
                    key={signup.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isAttended
                        ? "bg-success/5 border-success/20"
                        : isSelected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:border-primary/20"
                    }`}
                  >
                    {!isAttended && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(signup.id)}
                      />
                    )}
                    {isAttended && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {signup.participant_name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {signup.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {signup.phone_number}
                          </span>
                        )}
                        <span>
                          Signed up:{" "}
                          {format(new Date(signup.signed_up_at), "dd MMM, HH:mm")}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={isAttended ? "default" : "secondary"}
                      className={
                        isAttended
                          ? "bg-success text-success-foreground"
                          : "bg-warning/10 text-warning"
                      }
                    >
                      {isAttended ? "Attended" : "Pending"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {signups.length > 0 && pendingCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllPending}>
                Select All Pending ({pendingCount})
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear Selection
                </Button>
              )}
            </div>
            <Button
              onClick={handleMarkAttendance}
              disabled={selectedIds.size === 0 || marking}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Attendance ({selectedIds.size})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
