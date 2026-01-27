import { useState } from 'react';
import { Settings, Database, Clock, Zap, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSyncSettings, SYNC_PRESETS, SyncSettings } from '@/hooks/useSyncSettings';
import { toast } from 'sonner';

interface SyncSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncSettingsDialog({ open, onOpenChange }: SyncSettingsDialogProps) {
  const { settings, saveSettings, resetSettings } = useSyncSettings();
  const [localSettings, setLocalSettings] = useState<SyncSettings>(settings);

  const handleSave = () => {
    saveSettings(localSettings);
    toast.success('Sync settings saved');
    onOpenChange(false);
  };

  const handlePreset = (preset: keyof typeof SYNC_PRESETS) => {
    setLocalSettings({ ...localSettings, ...SYNC_PRESETS[preset].settings });
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
    toast.info('Settings reset to defaults');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Offline Sync Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="retention" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="retention" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Retention
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              <Database className="mr-1 h-3 w-3" />
              Data
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-xs">
              <Zap className="mr-1 h-3 w-3" />
              Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="retention" className="mt-4 space-y-4">
            <div className="flex gap-2">
              {Object.entries(SYNC_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(key as keyof typeof SYNC_PRESETS)}
                  className="flex-1 text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Attendance History</Label>
                  <Badge variant="secondary">{localSettings.attendanceRetentionDays} days</Badge>
                </div>
                <Slider
                  value={[localSettings.attendanceRetentionDays]}
                  onValueChange={([v]) => setLocalSettings({ ...localSettings, attendanceRetentionDays: v })}
                  min={7}
                  max={90}
                  step={7}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Messages History</Label>
                  <Badge variant="secondary">{localSettings.messagesRetentionDays} days</Badge>
                </div>
                <Slider
                  value={[localSettings.messagesRetentionDays]}
                  onValueChange={([v]) => setLocalSettings({ ...localSettings, messagesRetentionDays: v })}
                  min={7}
                  max={60}
                  step={7}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Assignments History</Label>
                  <Badge variant="secondary">{localSettings.assignmentsRetentionDays} days</Badge>
                </div>
                <Slider
                  value={[localSettings.assignmentsRetentionDays]}
                  onValueChange={([v]) => setLocalSettings({ ...localSettings, assignmentsRetentionDays: v })}
                  min={14}
                  max={90}
                  step={7}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Storage</Label>
                  <Badge variant="secondary">{localSettings.maxStorageMb} MB</Badge>
                </div>
                <Slider
                  value={[localSettings.maxStorageMb]}
                  onValueChange={([v]) => setLocalSettings({ ...localSettings, maxStorageMb: v })}
                  min={50}
                  max={500}
                  step={50}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-4 space-y-3">
            {[
              { key: 'cacheStudents', label: 'Students & Rosters' },
              { key: 'cacheTimetable', label: 'Timetable & Schedule' },
              { key: 'cacheAttendance', label: 'Attendance Records' },
              { key: 'cacheAssignments', label: 'Assignments' },
              { key: 'cacheHomework', label: 'Homework' },
              { key: 'cacheMessages', label: 'Messages & Conversations' },
              { key: 'cacheContacts', label: 'Contacts Directory' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor={key} className="text-sm font-normal">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={localSettings[key as keyof SyncSettings] as boolean}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, [key]: checked })
                  }
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sync" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Auto-sync on reconnect</Label>
                <p className="text-xs text-muted-foreground">Sync automatically when back online</p>
              </div>
              <Switch
                checked={localSettings.autoSyncOnConnection}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoSyncOnConnection: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Background sync</Label>
                <p className="text-xs text-muted-foreground">Sync data even when app is minimized</p>
              </div>
              <Switch
                checked={localSettings.backgroundSyncEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, backgroundSyncEnabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Sync Priority</Label>
              <Select
                value={localSettings.syncPriority}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, syncPriority: value as SyncSettings['syncPriority'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">
                    Attendance First - Prioritize attendance records
                  </SelectItem>
                  <SelectItem value="messages">
                    Messages First - Prioritize messages
                  </SelectItem>
                  <SelectItem value="balanced">
                    Balanced - Equal priority for all
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
