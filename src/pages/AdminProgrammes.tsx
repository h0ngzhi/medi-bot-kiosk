import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Calendar,
  MapPin,
  ArrowLeft,
  Phone,
  Globe,
  Clock,
  RefreshCw,
  ClipboardList,
  CheckCircle,
  Star,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { AttendanceDialog } from "@/components/admin/AttendanceDialog";
import { ProgrammeFeedbackDisplay } from "@/components/community/ProgrammeFeedbackDisplay";
import { getProgrammeStatus } from "@/utils/programmeUtils";

interface Programme {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  region: string | null;
  max_capacity: number | null;
  current_signups: number | null;
  contact_number: string | null;
  admin_email: string | null;
  is_online: boolean | null;
  is_active: boolean;
  points_reward: number;
  duration: string | null;
  conducted_by: string | null;
  group_size: string | null;
  languages: string[] | null;
  learning_objectives: string[] | null;
  guest_option: string | null;
  updated_at: string | null;
  created_at: string;
  serial_id: string | null;
  series_id: string;
  recurrence_type: string | null;
}

interface ExistingSeries {
  series_id: string;
  title: string;
  serial_id: string | null;
  event_date: string | null;
  review_count: number;
}

type ProgrammeForm = {
  title: string;
  description: string;
  category: string;
  event_date: string;
  event_time: string;
  location: string;
  region: string;
  max_capacity: number;
  contact_number: string;
  admin_email: string;
  is_online: boolean;
  online_link: string;
  is_active: boolean;
  points_reward: number;
  duration_hours: number;
  duration_minutes: number;
  conducted_by: string;
  group_size: string;
  languages: string;
  learning_objectives: string;
  guest_option: string;
  recurrence_type: string;
  series_mode: 'new' | 'existing';
  selected_series_id: string;
};

// Helper to convert hours + minutes to duration string for storage
const formatDurationForStorage = (hours: number, minutes: number): string => {
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minutes`);
  return parts.length > 0 ? parts.join(' ') : '1 hour';
};

// Helper to parse duration string back to hours and minutes
const parseDurationString = (duration: string | null): { hours: number; minutes: number } => {
  if (!duration) return { hours: 1, minutes: 0 };
  
  const lowerDuration = duration.toLowerCase();
  let hours = 0;
  let minutes = 0;
  
  const hoursMatch = lowerDuration.match(/(\d+\.?\d*)\s*h(ou)?r?s?/);
  if (hoursMatch) {
    hours = Math.floor(parseFloat(hoursMatch[1]));
  }
  
  const minutesMatch = lowerDuration.match(/(\d+)\s*min(ute)?s?/);
  if (minutesMatch) {
    minutes = parseInt(minutesMatch[1], 10);
  }
  
  // If nothing matched, default to 1 hour
  if (hours === 0 && minutes === 0) {
    hours = 1;
  }
  
  return { hours, minutes };
};

const CATEGORIES = [
  "Active Ageing",
  "Social",
  "Health Education",
  "Caregiver",
  "Digital Literacy",
];

const REGIONS = ["North", "Central", "East", "West", "North-East"];

const emptyForm: ProgrammeForm = {
  title: "",
  description: "",
  category: "Active Ageing",
  event_date: "",
  event_time: "",
  location: "",
  region: "Central",
  max_capacity: 30,
  contact_number: "",
  admin_email: "",
  is_online: false,
  online_link: "",
  is_active: true,
  points_reward: 10,
  duration_hours: 1,
  duration_minutes: 0,
  conducted_by: "",
  group_size: "",
  languages: "",
  learning_objectives: "",
  guest_option: "",
  recurrence_type: "one_time",
  series_mode: 'new',
  selected_series_id: "",
};

const AdminProgrammes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgrammeForm>(emptyForm);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [existingSeries, setExistingSeries] = useState<ExistingSeries[]>([]);
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchProgrammes();
  }, []);

  // Check for completed recurring programmes and create new entries
  const checkAndCreateRecurringProgrammes = async (programmes: Programme[]) => {
    for (const programme of programmes) {
      const status = getProgrammeStatus(programme.event_date, programme.event_time, programme.duration);
      const recurrenceType = (programme as any).recurrence_type;
      
      if (status === 'completed' && recurrenceType && recurrenceType !== 'one_time' && programme.event_date) {
        // Check if a future instance already exists with same title
        const { data: existingFuture } = await supabase
          .from("community_programmes")
          .select("id")
          .eq("title", programme.title)
          .gt("event_date", programme.event_date)
          .limit(1);
        
        if (!existingFuture || existingFuture.length === 0) {
          // Calculate new date
          const currentDate = new Date(programme.event_date);
          const daysToAdd = recurrenceType === 'weekly' ? 7 : 14;
          const newDate = addDays(currentDate, daysToAdd);
          
          // Only create if new date is within 1 month from original
          const maxDate = addDays(currentDate, 30);
          if (newDate <= maxDate) {
            const { error } = await supabase
              .from("community_programmes")
              .insert([{
                title: programme.title,
                description: programme.description,
                category: programme.category,
                event_date: format(newDate, 'yyyy-MM-dd'),
                event_time: programme.event_time,
                location: programme.location,
                region: (programme as any).region,
                max_capacity: programme.max_capacity,
                current_signups: 0,
                contact_number: programme.contact_number,
                admin_email: programme.admin_email,
                is_online: programme.is_online,
                is_active: true,
                points_reward: programme.points_reward,
                duration: programme.duration,
                conducted_by: programme.conducted_by,
                group_size: programme.group_size,
                languages: programme.languages,
                learning_objectives: programme.learning_objectives,
                guest_option: programme.guest_option,
                recurrence_type: recurrenceType,
                series_id: (programme as any).series_id, // Keep same series_id for reviews
              }]);
            
            if (!error) {
              toast({
                title: "Recurring Programme Created",
                description: `New session for "${programme.title}" created for ${format(newDate, 'dd MMM yyyy')}`,
              });
            }
          }
        }
      }
    }
  };

  const fetchProgrammes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_programmes")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load programmes",
        variant: "destructive",
      });
    } else {
      const progs = (data || []) as Programme[];
      setProgrammes(progs);
      // Check for recurring programmes that need new instances
      await checkAndCreateRecurringProgrammes(progs);
      // Fetch existing series with review counts
      await fetchExistingSeriesWithReviews(progs);
    }
    setLoading(false);
  };

  // Fetch unique series with review counts for the series selection dropdown
  const fetchExistingSeriesWithReviews = async (progs: Programme[]) => {
    // Get unique series
    const seriesMap = new Map<string, { title: string; serial_id: string | null; event_date: string | null }>();
    for (const p of progs) {
      if (p.series_id && !seriesMap.has(p.series_id)) {
        seriesMap.set(p.series_id, {
          title: p.title,
          serial_id: p.serial_id,
          event_date: p.event_date,
        });
      } else if (p.series_id && seriesMap.has(p.series_id)) {
        // Keep the latest date
        const existing = seriesMap.get(p.series_id)!;
        if (p.event_date && (!existing.event_date || p.event_date > existing.event_date)) {
          seriesMap.set(p.series_id, {
            title: p.title,
            serial_id: p.serial_id || existing.serial_id,
            event_date: p.event_date,
          });
        }
      }
    }

    // Fetch review counts for each series
    const seriesIds = Array.from(seriesMap.keys());
    const reviewCountMap: Record<string, number> = {};

    if (seriesIds.length > 0) {
      // Get all programme IDs for each series
      const programmeIdsBySeries: Record<string, string[]> = {};
      for (const p of progs) {
        if (p.series_id) {
          if (!programmeIdsBySeries[p.series_id]) {
            programmeIdsBySeries[p.series_id] = [];
          }
          programmeIdsBySeries[p.series_id].push(p.id);
        }
      }

      // Fetch all feedback
      const { data: feedback } = await supabase
        .from("programme_feedback")
        .select("programme_id");

      if (feedback) {
        for (const seriesId of seriesIds) {
          const progIds = programmeIdsBySeries[seriesId] || [];
          const count = feedback.filter(f => progIds.includes(f.programme_id)).length;
          reviewCountMap[seriesId] = count;
        }
      }
    }

    setReviewCounts(reviewCountMap);

    // Build existing series list
    const seriesList: ExistingSeries[] = Array.from(seriesMap.entries()).map(([series_id, info]) => ({
      series_id,
      title: info.title,
      serial_id: info.serial_id,
      event_date: info.event_date,
      review_count: reviewCountMap[series_id] || 0,
    }));

    // Sort by review count (highest first), then by date
    seriesList.sort((a, b) => {
      if (b.review_count !== a.review_count) return b.review_count - a.review_count;
      return (b.event_date || '').localeCompare(a.event_date || '');
    });

    setExistingSeries(seriesList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Programme title is required",
        variant: "destructive",
      });
      return;
    }

    const basePayload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      event_date: form.event_date || null,
      event_time: form.event_time || null,
      location: form.is_online ? null : (form.location || null),
      region: form.is_online ? null : form.region,
      max_capacity: form.max_capacity,
      contact_number: form.contact_number || null,
      admin_email: form.admin_email || null,
      is_online: form.is_online,
      online_link: form.is_online ? (form.online_link || null) : null,
      is_active: form.is_active,
      points_reward: form.points_reward,
      duration: formatDurationForStorage(form.duration_hours, form.duration_minutes),
      conducted_by: form.conducted_by || null,
      group_size: form.group_size || null,
      languages: form.languages ? form.languages.split(',').map(l => l.trim()).filter(Boolean) : null,
      learning_objectives: form.learning_objectives ? form.learning_objectives.split('\n').map(l => l.trim()).filter(Boolean) : null,
      guest_option: form.guest_option || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("community_programmes")
        .update(basePayload)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update programme",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Programme updated" });
        setDialogOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchProgrammes();
      }
    } else {
      // For new programmes, determine series_id based on mode
      const newId = crypto.randomUUID();
      const seriesId = form.series_mode === 'existing' && form.selected_series_id 
        ? form.selected_series_id 
        : newId;
      
      const payload = {
        ...basePayload,
        id: newId,
        series_id: seriesId,
        recurrence_type: form.recurrence_type,
      };
      
      const { error } = await supabase
        .from("community_programmes")
        .insert([payload]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create programme",
          variant: "destructive",
        });
      } else {
        const isLinkingToExisting = form.series_mode === 'existing' && form.selected_series_id;
        toast({ 
          title: "Success", 
          description: isLinkingToExisting 
            ? "Programme created and linked to existing series" 
            : "Programme created" 
        });
        setDialogOpen(false);
        setForm(emptyForm);
        fetchProgrammes();
      }
    }
  };

  const handleEdit = (programme: Programme) => {
    setEditingId(programme.id);
    setForm({
      title: programme.title,
      description: programme.description || "",
      category: programme.category || "Active Ageing",
      event_date: programme.event_date || "",
      event_time: programme.event_time || "",
      location: programme.location || "",
      region: programme.region || "Central",
      max_capacity: programme.max_capacity || 30,
      contact_number: programme.contact_number || "",
      admin_email: programme.admin_email || "",
      is_online: programme.is_online || false,
      online_link: (programme as any).online_link || "",
      is_active: programme.is_active,
      points_reward: programme.points_reward,
      duration_hours: parseDurationString(programme.duration).hours,
      duration_minutes: parseDurationString(programme.duration).minutes,
      conducted_by: programme.conducted_by || "",
      group_size: programme.group_size || "",
      languages: programme.languages?.join(', ') || "",
      learning_objectives: programme.learning_objectives?.join('\n') || "",
      guest_option: programme.guest_option || "",
      recurrence_type: programme.recurrence_type || "one_time",
      series_mode: 'new', // When editing, we don't change series
      selected_series_id: programme.series_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("community_programmes")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete programme",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Programme deleted" });
      fetchProgrammes();
    }
  };

  const openNewDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const getSpotsRemaining = (programme: Programme) => {
    const max = programme.max_capacity || 0;
    const current = programme.current_signups || 0;
    return Math.max(0, max - current);
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "Active Ageing":
        return "bg-primary/10 text-primary";
      case "Social":
        return "bg-secondary/10 text-secondary";
      case "Health Education":
        return "bg-success/10 text-success";
      case "Caregiver":
        return "bg-warning/10 text-warning";
      case "Digital Literacy":
        return "bg-info/10 text-info";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const openAttendanceDialog = (programme: Programme) => {
    setSelectedProgramme(programme);
    setAttendanceDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Programme Management
              </h1>
              <p className="text-sm text-muted-foreground">
                CCN Admin Dashboard
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchProgrammes}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Programme
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Programme" : "Add New Programme"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                  {/* Programme Series Selection - Only for new programmes */}
                  {!editingId && existingSeries.length > 0 && (
                    <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                      <h3 className="font-semibold text-foreground border-b pb-2">
                        Programme Series
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="series_new"
                            name="series_mode"
                            checked={form.series_mode === 'new'}
                            onChange={() => setForm({ ...form, series_mode: 'new', selected_series_id: '' })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="series_new" className="cursor-pointer">
                            Start new programme series
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="series_existing"
                            name="series_mode"
                            checked={form.series_mode === 'existing'}
                            onChange={() => setForm({ ...form, series_mode: 'existing' })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="series_existing" className="cursor-pointer">
                            Continue existing programme series (inherit reviews)
                          </Label>
                        </div>
                        {form.series_mode === 'existing' && (
                          <div className="ml-7">
                            <Select
                              value={form.selected_series_id}
                              onValueChange={(v) => setForm({ ...form, selected_series_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a programme series..." />
                              </SelectTrigger>
                              <SelectContent>
                                {existingSeries.map((s) => (
                                  <SelectItem key={s.series_id} value={s.series_id}>
                                    <div className="flex items-center gap-2">
                                      <span>{s.title}</span>
                                      {s.serial_id && (
                                        <span className="text-muted-foreground text-xs">#{s.serial_id}</span>
                                      )}
                                      {s.review_count > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          {s.review_count}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              New sessions will share the same reviews as the selected series.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Programme Basics */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">
                      Programme Basics
                    </h3>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="title">Programme Title *</Label>
                        <Input
                          id="title"
                          value={form.title}
                          onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                          }
                          placeholder="e.g. Morning Tai Chi for Seniors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={form.category}
                            onValueChange={(v) =>
                              setForm({ ...form, category: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="points">Points Reward</Label>
                          <Input
                            id="points"
                            type="number"
                            value={form.points_reward}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                points_reward: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Short Description</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                          }
                          placeholder="Plain language, 1-2 sentences"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="conducted_by">Conducted By</Label>
                        <Input
                          id="conducted_by"
                          value={form.conducted_by}
                          onChange={(e) =>
                            setForm({ ...form, conducted_by: e.target.value })
                          }
                          placeholder="e.g. Health Coach, Volunteer"
                        />
                      </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="group_size">Group Size (e.g. 15-25 pax)</Label>
                          <Input
                            id="group_size"
                            value={form.group_size}
                            onChange={(e) =>
                              setForm({ ...form, group_size: e.target.value })
                            }
                            placeholder="e.g. 15-25 pax"
                          />
                        </div>
                        <div>
                          <Label htmlFor="languages">Languages (comma-separated)</Label>
                          <Input
                            id="languages"
                            value={form.languages}
                            onChange={(e) =>
                              setForm({ ...form, languages: e.target.value })
                            }
                            placeholder="e.g. English, Mandarin, Malay"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="learning_objectives">Learning Objectives (one per line)</Label>
                          <Textarea
                            id="learning_objectives"
                            value={form.learning_objectives}
                            onChange={(e) =>
                              setForm({ ...form, learning_objectives: e.target.value })
                            }
                            placeholder="Learn basic techniques&#10;Improve balance and coordination&#10;Build strength"
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter each objective on a new line.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="guest_option">Guest Tag (Optional)</Label>
                          <Select
                            value={form.guest_option || "none"}
                            onValueChange={(v) =>
                              setForm({ ...form, guest_option: v === "none" ? "" : v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No tag" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No tag</SelectItem>
                              <SelectItem value="caregiver_welcome">👥 Caregiver Welcome</SelectItem>
                              <SelectItem value="bring_friend">👥 Bring a Friend</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Shows a small tag on the programme card.
                          </p>
                        </div>
                      </div>
                    </div>

                  {/* Schedule & Location */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">
                      Schedule & Location
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event_date">Date</Label>
                        <Input
                          id="event_date"
                          type="date"
                          value={form.event_date}
                          onChange={(e) =>
                            setForm({ ...form, event_date: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="event_time">Time</Label>
                        <Input
                          id="event_time"
                          type="time"
                          value={form.event_time}
                          onChange={(e) =>
                            setForm({ ...form, event_time: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration</Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Select
                              value={form.duration_hours.toString()}
                              onValueChange={(v) =>
                                setForm({ ...form, duration_hours: parseInt(v) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                                  <SelectItem key={h} value={h.toString()}>
                                    {h} hr{h !== 1 ? 's' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Select
                              value={form.duration_minutes.toString()}
                              onValueChange={(v) =>
                                setForm({ ...form, duration_minutes: parseInt(v) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 15, 30, 45].map((m) => (
                                  <SelectItem key={m} value={m.toString()}>
                                    {m} min
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Programme ends after this duration (affects reviews)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="recurrence">Recurrence</Label>
                        <Select
                          value={form.recurrence_type || "one_time"}
                          onValueChange={(v) =>
                            setForm({ ...form, recurrence_type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-time</SelectItem>
                            <SelectItem value="weekly">Weekly (max 1 month)</SelectItem>
                            <SelectItem value="bi_weekly">Bi-weekly (max 1 month)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recurring programmes need manual review after 1 month.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="is_online"
                        checked={form.is_online}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, is_online: checked })
                        }
                      />
                      <Label htmlFor="is_online">Online Programme</Label>
                    </div>
                    {form.is_online ? (
                      <div>
                        <Label htmlFor="online_link">Online Meeting Link *</Label>
                        <Input
                          id="online_link"
                          value={form.online_link}
                          onChange={(e) =>
                            setForm({ ...form, online_link: e.target.value })
                          }
                          placeholder="e.g. https://zoom.us/j/123456789"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Zoom, Google Meet, or other video call link
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="location">Venue Name</Label>
                          <Input
                            id="location"
                            value={form.location}
                            onChange={(e) =>
                              setForm({ ...form, location: e.target.value })
                            }
                            placeholder="e.g. Bedok Community Centre"
                          />
                        </div>
                        <div>
                          <Label htmlFor="region">Region</Label>
                          <Select
                            value={form.region}
                            onValueChange={(v) =>
                              setForm({ ...form, region: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REGIONS.map((reg) => (
                                <SelectItem key={reg} value={reg}>
                                  {reg}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Capacity & Contact */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">
                      Capacity & Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_capacity">Max Participants</Label>
                        <Input
                          id="max_capacity"
                          type="number"
                          value={form.max_capacity}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              max_capacity: parseInt(e.target.value) || 30,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_number">Admin Phone Number</Label>
                        <Input
                          id="contact_number"
                          value={form.contact_number}
                          onChange={(e) =>
                            setForm({ ...form, contact_number: e.target.value })
                          }
                          placeholder="e.g. 6123 4567"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="admin_email">Admin Email</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={form.admin_email}
                        onChange={(e) =>
                          setForm({ ...form, admin_email: e.target.value })
                        }
                        placeholder="e.g. admin@cc.gov.sg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email to notify when someone signs up
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="is_active"
                        checked={form.is_active}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, is_active: checked })
                        }
                      />
                      <Label htmlFor="is_active">Active (visible to users)</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingId ? "Update" : "Create"} Programme
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Programmes</p>
              <p className="text-2xl font-bold text-foreground">
                {programmes.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-success">
                {programmes.filter((p) => p.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Signups</p>
              <p className="text-2xl font-bold text-primary">
                {programmes.reduce((sum, p) => sum + (p.current_signups || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Online</p>
              <p className="text-2xl font-bold text-info">
                {programmes.filter((p) => p.is_online).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notice */}
        <div className="bg-accent/50 border border-accent rounded-xl p-4 mb-6">
          <p className="text-sm text-accent-foreground">
            <strong>Note:</strong> Programmes are reviewed quarterly. Last system update:{" "}
            {format(new Date(), "dd MMM yyyy")}
          </p>
        </div>

        {/* Programme List with Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "completed")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming ({programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'upcoming').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading programmes...</div>
            ) : programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'upcoming').length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No upcoming programmes</p>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Programme
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'upcoming').map((programme) => (
              <Card
                key={programme.id}
                className={`bg-card transition-all ${
                  !programme.is_active ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {programme.title}
                        </h3>
                        {programme.serial_id && (
                          <Badge variant="outline" className="text-xs font-mono">
                            #{programme.serial_id}
                          </Badge>
                        )}
                        {reviewCounts[programme.series_id] > 0 && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            <Star className="h-3 w-3 mr-1 fill-amber-500" />
                            {reviewCounts[programme.series_id]} review{reviewCounts[programme.series_id] !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={getCategoryColor(programme.category)}
                        >
                          {programme.category}
                        </Badge>
                        {!programme.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        {programme.is_online && (
                          <Badge variant="outline" className="text-info border-info">
                            <Globe className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      {programme.description && (
                        <p className="text-sm text-muted-foreground">
                          {programme.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {programme.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(programme.event_date), "dd MMM yyyy")}
                            {programme.event_time && ` at ${programme.event_time}`}
                          </span>
                        )}
                        {programme.location && !programme.is_online && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {programme.location}
                            {programme.region && ` (${programme.region})`}
                          </span>
                        )}
                        {programme.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {programme.duration}
                          </span>
                        )}
                        {programme.contact_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {programme.contact_number}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Capacity */}
                      <div className="text-center px-4 py-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-1 text-foreground">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">
                            {programme.current_signups || 0}/{programme.max_capacity || 0}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getSpotsRemaining(programme)} spots left
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAttendanceDialog(programme)}
                          className="gap-1"
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span className="hidden sm:inline">Signups</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(programme)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Programme?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{programme.title}" and
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(programme.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                  {programme.updated_at && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      Last updated: {format(new Date(programme.updated_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'completed').length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No completed programmes yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {programmes.filter(p => getProgrammeStatus(p.event_date, p.event_time, p.duration) === 'completed').map((programme) => (
                  <Card key={programme.id} className="bg-card opacity-90">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{programme.title}</h3>
                            {programme.serial_id && (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{programme.serial_id}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                          {programme.event_date && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(programme.event_date), "dd MMM yyyy")}
                              {programme.event_time && ` at ${programme.event_time}`}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {programme.current_signups || 0} participants attended
                          </p>
                          {/* Feedback Display - uses series_id to show all reviews from recurring sessions */}
                          <ProgrammeFeedbackDisplay programmeId={programme.id} seriesId={programme.series_id} />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAttendanceDialog(programme)} className="gap-1">
                            <Star className="h-4 w-4" />
                            View Feedback
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Programme?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{programme.title}" and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(programme.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Attendance Dialog */}
        {selectedProgramme && (
          <AttendanceDialog
            open={attendanceDialogOpen}
            onOpenChange={setAttendanceDialogOpen}
            programmeId={selectedProgramme.id}
            programmeTitle={selectedProgramme.title}
            pointsReward={selectedProgramme.points_reward}
            onAttendanceMarked={fetchProgrammes}
          />
        )}
      </main>
    </div>
  );
};

export default AdminProgrammes;
