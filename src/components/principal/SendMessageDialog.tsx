import { useState, useEffect, useMemo } from "react";
import { Send, MessageSquare, Search, Users, GraduationCap, Briefcase, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface User {
  user_id: string;
  display_name: string | null;
  role: string;
  email?: string;
}

interface SendMessageDialogProps {
  schoolId: string;
  trigger?: React.ReactNode;
}

export function SendMessageDialog({ schoolId, trigger }: SendMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    if (!open || !schoolId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Fetch all users with their roles in this school
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("school_id", schoolId);

        if (!roles || roles.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const userIds = [...new Set(roles.map((r) => r.user_id))];

        // Fetch profiles for these users
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profiles ?? []).map((p) => [p.user_id, p.display_name])
        );

        // Build user list with roles
        const userList: User[] = roles.map((r) => ({
          user_id: r.user_id,
          display_name: profileMap.get(r.user_id) || "Unknown User",
          role: r.role,
        }));

        // Remove duplicates (keep first occurrence)
        const uniqueUsers = userList.reduce((acc, user) => {
          const existing = acc.find((u) => u.user_id === user.user_id);
          if (!existing) {
            acc.push(user);
          }
          return acc;
        }, [] as User[]);

        setUsers(uniqueUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    setSelectedUsers([]);
    setSubject("");
    setContent("");
    setSearch("");
    setRoleFilter("all");
  }, [open, schoolId]);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(searchLower) ||
          u.role.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [users, roleFilter, search]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.user_id === user.user_id);
      if (exists) {
        return prev.filter((u) => u.user_id !== user.user_id);
      }
      return [...prev, user];
    });
  };

  const selectAllFiltered = () => {
    setSelectedUsers((prev) => {
      const newSelected = [...prev];
      filteredUsers.forEach((user) => {
        if (!newSelected.find((u) => u.user_id === user.user_id)) {
          newSelected.push(user);
        }
      });
      return newSelected;
    });
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({ title: "Please select at least one recipient", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const senderId = userData.user?.id;

      if (!senderId) {
        toast({ title: "Authentication error", variant: "destructive" });
        setSending(false);
        return;
      }

      // Create admin messages for each recipient
      const messages = selectedUsers.map((user) => ({
        school_id: schoolId,
        sender_user_id: senderId,
        subject: subject.trim() || "Message from Principal",
        content: content.trim(),
        priority: "normal",
        status: "pending",
      }));

      const { error } = await supabase.from("admin_messages").insert(messages);

      if (error) {
        throw error;
      }

      // Also create notifications for each recipient
      const notifications = selectedUsers.map((user) => ({
        school_id: schoolId,
        user_id: user.user_id,
        title: subject.trim() || "New Message from Principal",
        body: content.trim().substring(0, 100) + (content.length > 100 ? "..." : ""),
        type: "admin_message",
      }));

      await supabase.from("app_notifications").insert(notifications);

      toast({
        title: "Message sent successfully",
        description: `Sent to ${selectedUsers.length} recipient(s)`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "teacher":
        return <GraduationCap className="h-3 w-3" />;
      case "student":
        return <Users className="h-3 w-3" />;
      case "accountant":
      case "hr":
      case "marketing":
        return <Briefcase className="h-3 w-3" />;
      default:
        return <UserCheck className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "teacher":
        return "default";
      case "principal":
      case "vice_principal":
        return "secondary";
      case "accountant":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="soft" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Send Message</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Message to Staff
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            {/* Selected Recipients */}
            {selectedUsers.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">
                    Selected Recipients ({selectedUsers.length})
                  </Label>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 text-xs">
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.user_id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleUser(user)}
                    >
                      {user.display_name}
                      <span className="ml-1 text-xs opacity-60">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* User Selection */}
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Select Recipients</Label>
                <Button variant="outline" size="sm" onClick={selectAllFiltered} className="text-xs">
                  Select All Visible
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Role Filter Tabs */}
              <Tabs value={roleFilter} onValueChange={setRoleFilter}>
                <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
                  <TabsTrigger value="all" className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    All ({roleCounts.all || 0})
                  </TabsTrigger>
                  {["teacher", "accountant", "hr", "marketing", "principal", "vice_principal"].map(
                    (role) =>
                      (roleCounts[role] || 0) > 0 && (
                        <TabsTrigger
                          key={role}
                          value={role}
                          className="h-7 rounded-full px-3 text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {role.replace("_", " ")} ({roleCounts[role]})
                        </TabsTrigger>
                      )
                  )}
                </TabsList>
              </Tabs>

              {/* User List */}
              <div className="max-h-32 rounded-lg border overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.some((u) => u.user_id === user.user_id);
                      return (
                        <div
                          key={user.user_id}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleUser(user)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                            </div>
                            <span className="text-sm truncate">{user.display_name}</span>
                          </div>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="shrink-0 gap-1 text-xs capitalize">
                            {getRoleIcon(user.role)}
                            {user.role.replace("_", " ")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Message Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject (optional)"
                />
              </div>

              <div>
                <Label htmlFor="content">Message *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder="Write your message..."
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Send Button - Fixed at bottom */}
        <div className="shrink-0 border-t bg-background px-6 py-4">
          <Button
            onClick={handleSend}
            disabled={sending || !content.trim() || selectedUsers.length === 0}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : `Send to ${selectedUsers.length} recipient(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
