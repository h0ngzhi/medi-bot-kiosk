import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammeAdmin } from "@/contexts/ProgrammeAdminContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Phone, CheckCircle2, Clock, Award, Trash2, XCircle, Lock, Eye } from "lucide-react";
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
  createdByAdminId: string | null;
  onAttendanceMarked: () => void;
}

export const AttendanceDialog = ({
  open,
  onOpenChange,
  programmeId,
  programmeTitle,
  pointsReward,
  createdByAdminId,
  onAttendanceMarked,
}: AttendanceDialogProps) => {
  const { toast } = useToast();
  const { canEdit, isViewer } = useProgrammeAdmin();
  
  // Check if current admin can modify this programme's signups
  const canModify = canEdit(createdByAdminId);
  const viewOnly = isViewer() || !canModify;
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState(false);
  const [absentPointsDeduction, setAbsentPointsDeduction] = useState(5);
  const [showAbsentConfirm, setShowAbsentConfirm] = useState(false);

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

  const handleRemoveSignup = async (signupId: string, kioskUserId: string, wasAttended: boolean) => {
    try {
      // If they had attended, we need to deduct points
      if (wasAttended) {
        const { data: userData, error: fetchError } = await supabase
          .from("kiosk_users")
          .select("points")
          .eq("id", kioskUserId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (userData) {
          const newPoints = Math.max(0, (userData.points || 0) - pointsReward);
          const { error: pointsError } = await supabase
            .from("kiosk_users")
            .update({ points: newPoints })
            .eq("id", kioskUserId);

          if (pointsError) throw pointsError;
        }
      }

      // Delete the signup record
      const { error: deleteError } = await supabase
        .from("user_programme_signups")
        .delete()
        .eq("id", signupId);

      if (deleteError) throw deleteError;

      // Decrement the programme's current_signups
      const { data: programmeData, error: progFetchError } = await supabase
        .from("community_programmes")
        .select("current_signups")
        .eq("id", programmeId)
        .maybeSingle();

      if (progFetchError) throw progFetchError;

      if (programmeData) {
        const newSignups = Math.max(0, (programmeData.current_signups || 0) - 1);
        await supabase
          .from("community_programmes")
          .update({ current_signups: newSignups })
          .eq("id", programmeId);
      }

      toast({
        title: "Removed",
        description: wasAttended 
          ? `Participant removed and ${pointsReward} points deducted.`
          : "Participant removed from signup list.",
      });

      fetchSignups();
      onAttendanceMarked();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive",
      });
    }
  };

  const handleMarkAbsent = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select participants to mark as absent",
        variant: "destructive",
      });
      return;
    }

    setMarkingAbsent(true);

    try {
      // Get the selected signups to find their kiosk_user_ids
      const selectedSignups = signups.filter((s) => selectedIds.has(s.id));
      const kioskUserIds = selectedSignups.map((s) => s.kiosk_user_id);

      // Update signup status to absent
      const { error: updateError } = await supabase
        .from("user_programme_signups")
        .update({
          status: "absent",
          attended_at: null,
        })
        .in("id", Array.from(selectedIds));

      if (updateError) throw updateError;

      // Deduct points from each user
      for (const kioskUserId of kioskUserIds) {
        const { data: userData, error: fetchError } = await supabase
          .from("kiosk_users")
          .select("points")
          .eq("id", kioskUserId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (userData) {
          const newPoints = Math.max(0, (userData.points || 0) - absentPointsDeduction);
          const { error: pointsError } = await supabase
            .from("kiosk_users")
            .update({ points: newPoints })
            .eq("id", kioskUserId);

          if (pointsError) throw pointsError;
        }
      }

      toast({
        title: "Marked Absent",
        description: `Marked ${selectedIds.size} participant(s) as absent. ${absentPointsDeduction} points deducted from each.`,
      });

      setSelectedIds(new Set());
      setShowAbsentConfirm(false);
      fetchSignups();
      onAttendanceMarked();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark participants as absent",
        variant: "destructive",
      });
    } finally {
      setMarkingAbsent(false);
    }
  };

  const pendingCount = signups.filter((s) => s.status === "pending" || s.status !== "attended" && s.status !== "absent").length;
  const attendedCount = signups.filter((s) => s.status === "attended").length;
  const absentCount = signups.filter((s) => s.status === "absent").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Signups & Attendance
            {viewOnly && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Eye className="h-3 w-3" />
                View Only
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{programmeTitle}</p>
          {viewOnly && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Lock className="h-3 w-3" />
              You can only modify signups for programmes you created
            </p>
          )}
        </DialogHeader>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-warning" />
            <span>{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>{attendedCount} attended</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-destructive" />
            <span>{absentCount} absent</span>
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
                const isAbsent = signup.status === "absent";
                const isPending = !isAttended && !isAbsent;
                const isSelected = selectedIds.has(signup.id);

                return (
                  <div
                    key={signup.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isAttended
                        ? "bg-success/5 border-success/20"
                        : isAbsent
                        ? "bg-destructive/5 border-destructive/20"
                        : isSelected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:border-primary/20"
                    }`}
                  >
                    {isPending && !viewOnly && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(signup.id)}
                      />
                    )}
                    {isPending && viewOnly && (
                      <div className="h-5 w-5 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {isAttended && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    {isAbsent && (
                      <XCircle className="h-5 w-5 text-destructive" />
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

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isAttended ? "default" : isAbsent ? "destructive" : "secondary"}
                        className={
                          isAttended
                            ? "bg-success text-success-foreground"
                            : isAbsent
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning/10 text-warning"
                        }
                      >
                        {isAttended ? "Attended" : isAbsent ? "Absent" : "Pending"}
                      </Badge>

                      {viewOnly ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50"
                          disabled
                          title="You cannot modify signups for this programme"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove "{signup.participant_name || "Unknown"}" from this programme?
                                {isAttended && ` Their ${pointsReward} points will also be deducted.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveSignup(signup.id, signup.kiosk_user_id, isAttended)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions - only show if user can modify */}
        {signups.length > 0 && pendingCount > 0 && !viewOnly && (
          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex items-center justify-between">
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
            </div>
            
            <div className="flex items-center justify-between gap-3">
              <AlertDialog open={showAbsentConfirm} onOpenChange={setShowAbsentConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={selectedIds.size === 0 || markingAbsent}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Absent ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Absent?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          Mark {selectedIds.size} participant(s) as absent and deduct points from their accounts.
                        </p>
                        <div className="flex items-center gap-3">
                          <Label htmlFor="absentPoints" className="whitespace-nowrap">
                            Points to deduct:
                          </Label>
                          <Input
                            id="absentPoints"
                            type="number"
                            min="0"
                            value={absentPointsDeduction}
                            onChange={(e) => setAbsentPointsDeduction(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-24"
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleMarkAbsent}
                      disabled={markingAbsent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {markingAbsent ? "Marking..." : `Deduct ${absentPointsDeduction} pts & Mark Absent`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                onClick={handleMarkAttendance}
                disabled={selectedIds.size === 0 || marking}
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Attendance ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
