import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineLeads, useOfflineCrmStages, useOfflineCampaigns, useOfflineCrmActivities } from "@/hooks/useOfflineData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Target, PhoneCall, TrendingUp, Calendar, WifiOff, RefreshCw, ArrowRight } from "lucide-react";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { format } from "date-fns";

export function MarketingHomeModule() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => tenant.status === "ready" ? tenant.schoolId : null, [tenant.status, tenant.schoolId]);

  const basePath = `/${schoolSlug}/marketing`;

  // Offline data hooks
  const { data: leads, loading: leadsLoading, isOffline, isUsingCache: leadsFromCache, refresh: refreshLeads } = useOfflineLeads(schoolId);
  const { data: stages, isUsingCache: stagesFromCache } = useOfflineCrmStages(schoolId);
  const { data: campaigns, isUsingCache: campaignsFromCache } = useOfflineCampaigns(schoolId);
  const { data: activities, isUsingCache: activitiesFromCache, refresh: refreshActivities } = useOfflineCrmActivities(schoolId);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const openLeads = leads.filter(l => l.status === "open" || !l.status).length;
    const wonLeads = leads.filter(l => l.status === "won").length;
    const lostLeads = leads.filter(l => l.status === "lost").length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;
    const openActivities = activities.filter(a => !a.completedAt).length;
    
    // Leads needing follow-up (past due or today)
    const today = new Date().toISOString().split('T')[0];
    const needsFollowUp = leads.filter(l => l.nextFollowUpAt && l.nextFollowUpAt <= today).length;
    
    return {
      totalLeads,
      openLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      activeCampaigns,
      openActivities,
      needsFollowUp,
    };
  }, [leads, campaigns, activities]);

  // Recent leads
  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0))
      .slice(0, 5);
  }, [leads]);

  // Upcoming follow-ups
  const upcomingFollowUps = useMemo(() => {
    return leads
      .filter(l => l.nextFollowUpAt)
      .sort((a, b) => new Date(a.nextFollowUpAt!).getTime() - new Date(b.nextFollowUpAt!).getTime())
      .slice(0, 5);
  }, [leads]);

  const handleRefresh = () => {
    if (!isOffline) {
      refreshLeads();
      refreshActivities();
    }
  };

  const loading = leadsLoading;
  const isUsingCache = leadsFromCache || stagesFromCache || campaignsFromCache || activitiesFromCache;

  if (loading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={handleRefresh} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
          <p className="text-muted-foreground">Lead management and campaign performance</p>
        </div>
        {!isOffline && (
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`${basePath}/leads`)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-primary" />
              <Badge variant="outline">{metrics.openLeads} open</Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{metrics.totalLeads}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`${basePath}/follow-ups`)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <PhoneCall className="h-5 w-5 text-amber-600" />
              <Badge variant={metrics.needsFollowUp > 0 ? "destructive" : "secondary"}>
                {metrics.needsFollowUp} pending
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{metrics.openActivities}</p>
            <p className="text-xs text-muted-foreground">Open Activities</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`${basePath}/campaigns`)}>
          <CardContent className="p-4">
            <Target className="h-5 w-5 text-blue-600" />
            <p className="mt-2 font-display text-2xl font-bold">{metrics.activeCampaigns}</p>
            <p className="text-xs text-muted-foreground">Active Campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <p className="mt-2 font-display text-2xl font-bold">{metrics.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Leads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/leads`)}>
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                {isOffline ? (
                  <span className="flex items-center justify-center gap-2">
                    <WifiOff className="h-4 w-4" /> No cached leads
                  </span>
                ) : (
                  "No leads found"
                )}
              </p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{lead.fullName}</p>
                      <p className="text-sm text-muted-foreground">{lead.email || lead.phone || "No contact"}</p>
                    </div>
                    <Badge variant={lead.status === "won" ? "default" : lead.status === "lost" ? "destructive" : "secondary"}>
                      {lead.status || "open"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Follow-ups</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/follow-ups`)}>
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No follow-ups scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcomingFollowUps.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{lead.fullName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {lead.nextFollowUpAt ? format(new Date(lead.nextFollowUpAt), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Score: {lead.score}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lead Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{metrics.openLeads}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-emerald-600">{metrics.wonLeads}</p>
              <p className="text-sm text-muted-foreground">Won</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-destructive">{metrics.lostLeads}</p>
              <p className="text-sm text-muted-foreground">Lost</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{metrics.totalLeads - metrics.openLeads - metrics.wonLeads - metrics.lostLeads}</p>
              <p className="text-sm text-muted-foreground">Other</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
