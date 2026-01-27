import { HelpCircle, WifiOff, RefreshCw, Database, Shield, Download, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface OfflineHelpDocsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const helpSections = [
  {
    id: 'basics',
    icon: <WifiOff className="h-4 w-4" />,
    title: 'Offline Mode Basics',
    content: `
**How Offline Mode Works**

When you lose internet connection, EduVerse automatically switches to offline mode. In this mode:

- All your recent data is available from the local cache
- You can view students, timetables, attendance history, and messages
- Changes you make are saved locally and will sync when you're back online
- A status indicator shows your connection state and pending changes

**What Gets Cached**

- Student rosters and enrollment data
- Timetable and schedule information
- Attendance records (last 30-90 days based on settings)
- Assignments and homework
- Messages and conversations
- Contact directory
    `.trim(),
  },
  {
    id: 'changes',
    icon: <RefreshCw className="h-4 w-4" />,
    title: 'Making Changes Offline',
    content: `
**Supported Offline Actions**

While offline, you can:
- Mark attendance
- Log period activities
- Create homework and assignments
- Compose and queue messages
- Record behavior notes
- Update grades

**How Changes Are Synced**

1. All offline changes are saved to a local queue
2. When you reconnect, changes sync automatically
3. High-priority items (attendance) sync first
4. You'll see a notification when sync completes
5. Failed items can be retried manually

**Conflict Resolution**

If the same data was changed by someone else while you were offline:
- The system will detect the conflict
- You'll be notified to review and resolve
- Your changes are preserved until you decide
    `.trim(),
  },
  {
    id: 'drafts',
    icon: <Database className="h-4 w-4" />,
    title: 'Form Drafts',
    content: `
**Auto-Save Drafts**

When you're filling out forms, your input is automatically saved:

- Drafts are saved every few seconds
- If you close the page accidentally, your work is preserved
- When you return, you'll be prompted to restore your draft
- Drafts expire after 24 hours

**Managing Drafts**

- Click "Restore Draft" to recover your saved input
- Click "Discard" to start fresh
- Drafts are automatically cleared after successful submission
    `.trim(),
  },
  {
    id: 'search',
    icon: <Search className="h-4 w-4" />,
    title: 'Offline Search',
    content: `
**Searching While Offline**

The offline search feature lets you find:

- Students by name, class, or section
- Contacts by name or email
- Assignments by title
- Homework entries

**Search Tips**

- Type at least 2 characters to start searching
- Results are ranked by relevance
- Search uses cached data only - some recent changes may not appear
- Use the regular search when online for complete results
    `.trim(),
  },
  {
    id: 'data',
    icon: <Download className="h-4 w-4" />,
    title: 'Data & Storage',
    content: `
**Managing Offline Storage**

Your device stores data locally for offline access. You can:

- View storage usage in the sync status panel
- Adjust retention periods in Sync Settings
- Choose which data types to cache
- Export your cache as a backup
- Import cache on a new device

**Storage Recommendations**

- Keep retention at 30 days for balanced storage
- Disable caching for data you rarely need offline
- Export and clear cache periodically on low-storage devices
- Use "Minimal" preset for limited storage situations
    `.trim(),
  },
  {
    id: 'troubleshooting',
    icon: <Shield className="h-4 w-4" />,
    title: 'Troubleshooting',
    content: `
**Common Issues**

**Data not showing offline:**
- Ensure you've visited the relevant pages while online
- Check that caching is enabled for that data type
- Try manually triggering a sync before going offline

**Changes not syncing:**
- Check the pending changes counter
- Verify you have a stable connection
- Try clicking the sync button manually
- Check for error messages in the sync panel

**Storage full:**
- Reduce retention periods in settings
- Clear old synced items
- Disable caching for non-essential data
- Export and clear cache if needed

**Getting Help**

If you continue experiencing issues:
1. Export your audit log from settings
2. Note the steps that led to the problem
3. Contact support with this information
    `.trim(),
  },
];

export function OfflineHelpDocs({ open, onOpenChange }: OfflineHelpDocsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Offline Mode Help
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <Accordion type="single" collapsible className="p-4">
            {helpSections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="gap-2 text-left">
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <span>{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {section.content.split('\n\n').map((paragraph, i) => {
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <h4 key={i} className="mb-2 mt-4 font-semibold text-foreground first:mt-0">
                            {paragraph.replace(/\*\*/g, '')}
                          </h4>
                        );
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={i} className="mb-2 list-inside list-disc space-y-1">
                            {paragraph.split('\n').map((item, j) => (
                              <li key={j}>{item.replace('- ', '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      if (paragraph.match(/^\d\./)) {
                        return (
                          <ol key={i} className="mb-2 list-inside list-decimal space-y-1">
                            {paragraph.split('\n').map((item, j) => (
                              <li key={j}>{item.replace(/^\d\.\s/, '')}</li>
                            ))}
                          </ol>
                        );
                      }
                      return <p key={i} className="mb-2">{paragraph}</p>;
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
