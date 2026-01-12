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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Gift,
  Trophy,
  Settings,
} from "lucide-react";

interface Reward {
  id: string;
  title: string;
  title_zh: string | null;
  title_ms: string | null;
  title_ta: string | null;
  description: string | null;
  description_zh: string | null;
  description_ms: string | null;
  description_ta: string | null;
  points_cost: number;
  tier: number;
  max_quantity: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface TierSetting {
  id: string;
  tier: number;
  title: string;
  title_zh: string | null;
  title_ms: string | null;
  title_ta: string | null;
  description: string | null;
  events_required: number;
  created_at: string;
}

type RewardForm = {
  title: string;
  title_zh: string;
  title_ms: string;
  title_ta: string;
  description: string;
  description_zh: string;
  description_ms: string;
  description_ta: string;
  points_cost: number;
  tier: number;
  max_quantity: number;
  is_active: boolean;
  display_order: number;
};

type TierForm = {
  tier: number;
  title: string;
  title_zh: string;
  title_ms: string;
  title_ta: string;
  description: string;
  events_required: number;
};

const emptyRewardForm: RewardForm = {
  title: "",
  title_zh: "",
  title_ms: "",
  title_ta: "",
  description: "",
  description_zh: "",
  description_ms: "",
  description_ta: "",
  points_cost: 100,
  tier: 1,
  max_quantity: 5,
  is_active: true,
  display_order: 0,
};

const emptyTierForm: TierForm = {
  tier: 1,
  title: "",
  title_zh: "",
  title_ms: "",
  title_ta: "",
  description: "",
  events_required: 30,
};

const AdminRewards = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardForm>(emptyRewardForm);
  const [tierForm, setTierForm] = useState<TierForm>(emptyTierForm);
  const [activeTab, setActiveTab] = useState<"rewards" | "tiers">("rewards");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchRewards(), fetchTierSettings()]);
    setLoading(false);
  };

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .order("tier", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load rewards",
        variant: "destructive",
      });
    } else {
      setRewards(data || []);
    }
  };

  const fetchTierSettings = async () => {
    const { data, error } = await supabase
      .from("reward_tier_settings")
      .select("*")
      .order("tier", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tier settings",
        variant: "destructive",
      });
    } else {
      setTierSettings(data || []);
    }
  };

  // Reward CRUD
  const handleRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rewardForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Reward title is required",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: rewardForm.title,
      title_zh: rewardForm.title_zh || null,
      title_ms: rewardForm.title_ms || null,
      title_ta: rewardForm.title_ta || null,
      description: rewardForm.description || null,
      description_zh: rewardForm.description_zh || null,
      description_ms: rewardForm.description_ms || null,
      description_ta: rewardForm.description_ta || null,
      points_cost: rewardForm.points_cost,
      tier: rewardForm.tier,
      max_quantity: rewardForm.max_quantity,
      is_active: rewardForm.is_active,
      display_order: rewardForm.display_order,
    };

    if (editingRewardId) {
      const { error } = await supabase
        .from("rewards")
        .update(payload)
        .eq("id", editingRewardId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update reward",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Reward updated" });
        setRewardDialogOpen(false);
        setEditingRewardId(null);
        setRewardForm(emptyRewardForm);
        fetchRewards();
      }
    } else {
      const { error } = await supabase.from("rewards").insert([payload]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create reward",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Reward created" });
        setRewardDialogOpen(false);
        setRewardForm(emptyRewardForm);
        fetchRewards();
      }
    }
  };

  const handleEditReward = (reward: Reward) => {
    setEditingRewardId(reward.id);
    setRewardForm({
      title: reward.title,
      title_zh: reward.title_zh || "",
      title_ms: reward.title_ms || "",
      title_ta: reward.title_ta || "",
      description: reward.description || "",
      description_zh: reward.description_zh || "",
      description_ms: reward.description_ms || "",
      description_ta: reward.description_ta || "",
      points_cost: reward.points_cost,
      tier: reward.tier,
      max_quantity: reward.max_quantity,
      is_active: reward.is_active,
      display_order: reward.display_order,
    });
    setRewardDialogOpen(true);
  };

  const handleDeleteReward = async (id: string) => {
    const { error } = await supabase.from("rewards").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Reward deleted" });
      fetchRewards();
    }
  };

  // Tier Settings CRUD
  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tierForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Tier title is required",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      tier: tierForm.tier,
      title: tierForm.title,
      title_zh: tierForm.title_zh || null,
      title_ms: tierForm.title_ms || null,
      title_ta: tierForm.title_ta || null,
      description: tierForm.description || null,
      events_required: tierForm.events_required,
    };

    if (editingTierId) {
      const { error } = await supabase
        .from("reward_tier_settings")
        .update(payload)
        .eq("id", editingTierId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update tier settings",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Tier settings updated" });
        setTierDialogOpen(false);
        setEditingTierId(null);
        setTierForm(emptyTierForm);
        fetchTierSettings();
      }
    } else {
      const { error } = await supabase
        .from("reward_tier_settings")
        .insert([payload]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create tier settings",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Tier settings created" });
        setTierDialogOpen(false);
        setTierForm(emptyTierForm);
        fetchTierSettings();
      }
    }
  };

  const handleEditTier = (tier: TierSetting) => {
    setEditingTierId(tier.id);
    setTierForm({
      tier: tier.tier,
      title: tier.title,
      title_zh: tier.title_zh || "",
      title_ms: tier.title_ms || "",
      title_ta: tier.title_ta || "",
      description: tier.description || "",
      events_required: tier.events_required,
    });
    setTierDialogOpen(true);
  };

  const handleDeleteTier = async (id: string) => {
    const { error } = await supabase
      .from("reward_tier_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete tier settings",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Tier settings deleted" });
      fetchTierSettings();
    }
  };

  const tier1Rewards = rewards.filter((r) => r.tier === 1);
  const tier2Rewards = rewards.filter((r) => r.tier === 2);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/programmes")}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Rewards Management
              </h1>
              <p className="text-muted-foreground">
                Manage rewards and tier settings
              </p>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "rewards" | "tiers")}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="tiers" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tier Settings
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <div className="flex justify-end mb-4">
              <Dialog
                open={rewardDialogOpen}
                onOpenChange={(open) => {
                  setRewardDialogOpen(open);
                  if (!open) {
                    setEditingRewardId(null);
                    setRewardForm(emptyRewardForm);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRewardId ? "Edit Reward" : "Add New Reward"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRewardSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title (English) *</Label>
                        <Input
                          value={rewardForm.title}
                          onChange={(e) =>
                            setRewardForm({ ...rewardForm, title: e.target.value })
                          }
                          placeholder="e.g., NTUC FairPrice Voucher"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Chinese)</Label>
                        <Input
                          value={rewardForm.title_zh}
                          onChange={(e) =>
                            setRewardForm({ ...rewardForm, title_zh: e.target.value })
                          }
                          placeholder="中文标题"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Malay)</Label>
                        <Input
                          value={rewardForm.title_ms}
                          onChange={(e) =>
                            setRewardForm({ ...rewardForm, title_ms: e.target.value })
                          }
                          placeholder="Tajuk Melayu"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Tamil)</Label>
                        <Input
                          value={rewardForm.title_ta}
                          onChange={(e) =>
                            setRewardForm({ ...rewardForm, title_ta: e.target.value })
                          }
                          placeholder="தமிழ் தலைப்பு"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description (English)</Label>
                      <Textarea
                        value={rewardForm.description}
                        onChange={(e) =>
                          setRewardForm({ ...rewardForm, description: e.target.value })
                        }
                        placeholder="Describe the reward..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Description (Chinese)</Label>
                        <Textarea
                          value={rewardForm.description_zh}
                          onChange={(e) =>
                            setRewardForm({
                              ...rewardForm,
                              description_zh: e.target.value,
                            })
                          }
                          placeholder="中文描述"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Malay)</Label>
                        <Textarea
                          value={rewardForm.description_ms}
                          onChange={(e) =>
                            setRewardForm({
                              ...rewardForm,
                              description_ms: e.target.value,
                            })
                          }
                          placeholder="Penerangan Melayu"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description (Tamil)</Label>
                      <Textarea
                        value={rewardForm.description_ta}
                        onChange={(e) =>
                          setRewardForm({
                            ...rewardForm,
                            description_ta: e.target.value,
                          })
                        }
                        placeholder="தமிழ் விளக்கம்"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Points Cost</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rewardForm.points_cost}
                          onChange={(e) =>
                            setRewardForm({
                              ...rewardForm,
                              points_cost: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tier</Label>
                        <Select
                          value={rewardForm.tier.toString()}
                          onValueChange={(v) =>
                            setRewardForm({ ...rewardForm, tier: parseInt(v) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Tier 1</SelectItem>
                            <SelectItem value="2">Tier 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rewardForm.max_quantity}
                          onChange={(e) =>
                            setRewardForm({
                              ...rewardForm,
                              max_quantity: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Order</Label>
                        <Input
                          type="number"
                          min={0}
                          value={rewardForm.display_order}
                          onChange={(e) =>
                            setRewardForm({
                              ...rewardForm,
                              display_order: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rewardForm.is_active}
                        onCheckedChange={(checked) =>
                          setRewardForm({ ...rewardForm, is_active: checked })
                        }
                      />
                      <Label>Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRewardDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingRewardId ? "Update" : "Create"} Reward
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : (
              <div className="space-y-8">
                {/* Tier 1 Rewards */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Tier 1 Rewards
                  </h2>
                  {tier1Rewards.length === 0 ? (
                    <p className="text-muted-foreground">No Tier 1 rewards yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tier1Rewards.map((reward) => (
                        <Card key={reward.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">
                                {reward.title}
                              </CardTitle>
                              <Badge variant={reward.is_active ? "default" : "secondary"}>
                                {reward.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">
                              {reward.description || "No description"}
                            </p>
                            <div className="flex items-center gap-4 text-sm mb-4">
                              <span className="font-medium text-primary">
                                {reward.points_cost} pts
                              </span>
                              <span className="text-muted-foreground">
                                Max: {reward.max_quantity}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditReward(reward)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Reward?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{reward.title}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteReward(reward.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier 2 Rewards */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-500" />
                    Tier 2 Rewards
                  </h2>
                  {tier2Rewards.length === 0 ? (
                    <p className="text-muted-foreground">No Tier 2 rewards yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tier2Rewards.map((reward) => (
                        <Card key={reward.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">
                                {reward.title}
                              </CardTitle>
                              <Badge variant={reward.is_active ? "default" : "secondary"}>
                                {reward.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">
                              {reward.description || "No description"}
                            </p>
                            <div className="flex items-center gap-4 text-sm mb-4">
                              <span className="font-medium text-primary">
                                {reward.points_cost} pts
                              </span>
                              <span className="text-muted-foreground">
                                Max: {reward.max_quantity}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditReward(reward)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Reward?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{reward.title}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteReward(reward.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tier Settings Tab */}
          <TabsContent value="tiers">
            <div className="flex justify-end mb-4">
              <Dialog
                open={tierDialogOpen}
                onOpenChange={(open) => {
                  setTierDialogOpen(open);
                  if (!open) {
                    setEditingTierId(null);
                    setTierForm(emptyTierForm);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Tier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTierId ? "Edit Tier Settings" : "Add New Tier"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTierSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tier Number *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tierForm.tier}
                          onChange={(e) =>
                            setTierForm({
                              ...tierForm,
                              tier: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Events Required *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tierForm.events_required}
                          onChange={(e) =>
                            setTierForm({
                              ...tierForm,
                              events_required: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title (English) *</Label>
                        <Input
                          value={tierForm.title}
                          onChange={(e) =>
                            setTierForm({ ...tierForm, title: e.target.value })
                          }
                          placeholder="e.g., Bronze Member"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Chinese)</Label>
                        <Input
                          value={tierForm.title_zh}
                          onChange={(e) =>
                            setTierForm({ ...tierForm, title_zh: e.target.value })
                          }
                          placeholder="中文标题"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Malay)</Label>
                        <Input
                          value={tierForm.title_ms}
                          onChange={(e) =>
                            setTierForm({ ...tierForm, title_ms: e.target.value })
                          }
                          placeholder="Tajuk Melayu"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Tamil)</Label>
                        <Input
                          value={tierForm.title_ta}
                          onChange={(e) =>
                            setTierForm({ ...tierForm, title_ta: e.target.value })
                          }
                          placeholder="தமிழ் தலைப்பு"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={tierForm.description}
                        onChange={(e) =>
                          setTierForm({ ...tierForm, description: e.target.value })
                        }
                        placeholder="Describe the tier benefits..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTierDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTierId ? "Update" : "Create"} Tier
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : tierSettings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No tier settings yet</p>
                <Button onClick={() => setTierDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Tier
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tierSettings.map((tier) => (
                  <Card key={tier.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy
                            className={`h-5 w-5 ${
                              tier.tier === 1 ? "text-amber-500" : "text-purple-500"
                            }`}
                          />
                          Tier {tier.tier}
                        </CardTitle>
                        <Badge>{tier.events_required} events</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium mb-1">{tier.title}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {tier.description || "No description"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTier(tier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tier?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete Tier {tier.tier} settings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTier(tier.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminRewards;
