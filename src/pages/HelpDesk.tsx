import { useState, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Search, Eye, Star, Globe, Mail, Phone, Settings, Loader2, Paperclip, ArrowLeft } from "lucide-react";
import SideNavigation from "@/components/SideNavigation";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import helpdeskLogo from "@/assets/bosplan-helpdesk-logo.png";
import { useHelpdeskTickets, HelpdeskTicket } from "@/hooks/useHelpdeskTickets";
import { useHelpdeskSettings } from "@/hooks/useHelpdeskSettings";
import { TicketDetailDialog } from "@/components/helpdesk/TicketDetailDialog";

type TicketView = "open" | "under_review" | "closed" | "all";

const viewOptions: { id: TicketView; label: string }[] = [
  { id: "open", label: "Open Tickets" },
  { id: "under_review", label: "Under Review" },
  { id: "closed", label: "Closed Tickets" },
  { id: "all", label: "All Tickets" },
];

const statusConfig = {
  open: { label: "Open", className: "bg-brand-green text-white" },
  under_review: { label: "Review", className: "bg-brand-orange text-white" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const channelIcons = {
  web: Globe,
  email: Mail,
  phone: Phone,
};

const HelpDesk = () => {
  const { navigate } = useOrgNavigation();
  const { tickets, loading, updateTicketStatus } = useHelpdeskTickets();
  const { settings } = useHelpdeskSettings();
  
  const [selectedView, setSelectedView] = useState<TicketView>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Filter tickets based on view and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // View filter
      if (selectedView !== "all" && ticket.status !== selectedView) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ticket.subject.toLowerCase().includes(query) ||
          (ticket.contact_name?.toLowerCase().includes(query)) ||
          ticket.ticket_number.toLowerCase().includes(query) ||
          (ticket.contact_email?.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [selectedView, statusFilter, searchQuery, tickets]);

  const ticketCount = filteredTickets.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map((t) => t.id));
    }
  };

  const handleStatusChange = (ticketId: string, newStatus: HelpdeskTicket["status"]) => {
    updateTicketStatus(ticketId, newStatus);
  };

  const handleTicketClick = (ticket: HelpdeskTicket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
  };

  // Get which columns to show based on settings
  const showName = settings?.show_name_field ?? true;
  const showEmail = settings?.show_email_field ?? true;
  const showPhone = settings?.show_phone_field ?? true;
  const showDetails = settings?.show_details_field ?? true;
  const showAttachment = settings?.show_attachment_field ?? true;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-brand-teal flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => navigate("/")}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <img src={helpdeskLogo} alt="Bosplan" className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="text-base sm:text-lg font-semibold text-white">HelpDesk</span>
          </div>

          {/* Active View Indicator */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-brand-orange fill-brand-orange" />
            <span className="text-white font-medium text-sm">
              {viewOptions.find((v) => v.id === selectedView)?.label} ({ticketCount})
            </span>
          </div>

          {/* Search and Filters */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap sm:ml-auto">
            <div className="relative w-full sm:w-48 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 sm:w-32 bg-white text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Settings Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm"
              onClick={() => navigate('/helpdesk/settings')}
            >
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row">
          {/* Views Sidebar - hidden on mobile */}
          <aside className="hidden md:block w-52 border-r bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Views</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
                All Views
              </p>
              {viewOptions.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedView === view.id
                      ? "bg-brand-green text-white"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile view selector */}
          <div className="md:hidden border-b bg-card p-3 overflow-x-auto">
            <div className="flex gap-2">
              {viewOptions.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    selectedView === view.id
                      ? "bg-brand-green text-white"
                      : "bg-secondary text-foreground"
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="bg-card rounded-lg border shadow-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 sm:w-12">
                        <Checkbox
                          checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-xs">ID</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-xs">SUBJECT</TableHead>
                      {showName && (
                        <TableHead className="font-semibold text-muted-foreground text-xs hidden sm:table-cell">NAME</TableHead>
                      )}
                      {showEmail && (
                        <TableHead className="font-semibold text-muted-foreground text-xs hidden md:table-cell">EMAIL</TableHead>
                      )}
                      {showPhone && (
                        <TableHead className="font-semibold text-muted-foreground text-xs hidden lg:table-cell">PHONE</TableHead>
                      )}
                      <TableHead className="font-semibold text-muted-foreground text-xs">STATUS</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-xs hidden lg:table-cell">CHANNEL</TableHead>
                      {showAttachment && (
                        <TableHead className="font-semibold text-muted-foreground text-xs hidden xl:table-cell">ATTACHMENT</TableHead>
                      )}
                      <TableHead className="font-semibold text-muted-foreground text-right text-xs hidden sm:table-cell">CREATED</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => {
                      const ChannelIcon = channelIcons[ticket.channel];
                      const status = statusConfig[ticket.status];

                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-secondary/50"
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <TableCell className="p-2 sm:p-4">
                            <Checkbox
                              checked={selectedTickets.includes(ticket.id)}
                              onCheckedChange={() => toggleTicketSelection(ticket.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="text-brand-teal font-medium text-xs sm:text-sm p-2 sm:p-4">
                            {ticket.ticket_number}
                          </TableCell>
                          <TableCell className="max-w-[120px] sm:max-w-[200px] truncate font-medium text-xs sm:text-sm p-2 sm:p-4">
                            {ticket.subject}
                          </TableCell>
                          {showName && (
                            <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell p-2 sm:p-4">
                              {ticket.contact_name || "-"}
                            </TableCell>
                          )}
                          {showEmail && (
                            <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell p-2 sm:p-4 max-w-[150px] truncate">
                              {ticket.contact_email || "-"}
                            </TableCell>
                          )}
                          {showPhone && (
                            <TableCell className="text-muted-foreground text-xs sm:text-sm hidden lg:table-cell p-2 sm:p-4">
                              {ticket.contact_phone || "-"}
                            </TableCell>
                          )}
                          <TableCell className="p-2 sm:p-4">
                            <Select 
                              value={ticket.status} 
                              onValueChange={(value) => handleStatusChange(ticket.id, value as HelpdeskTicket["status"])}
                            >
                              <SelectTrigger className="w-24 h-7 text-xs border-0 p-0">
                                <Badge className={cn("font-medium text-[10px] sm:text-xs", status.className)}>
                                  {status.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                              <ChannelIcon className="w-4 h-4" />
                              <span className="capitalize">{ticket.channel}</span>
                            </div>
                          </TableCell>
                          {showAttachment && (
                            <TableCell className="hidden xl:table-cell p-2 sm:p-4">
                              {ticket.attachment_url ? (
                                <a 
                                  href={ticket.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-brand-teal hover:underline text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {ticket.attachment_name || "View"}
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right text-muted-foreground text-[10px] sm:text-sm hidden sm:table-cell p-2 sm:p-4">
                            {formatDate(ticket.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                          {tickets.length === 0 ? (
                            <div className="space-y-2">
                              <p>No tickets yet</p>
                              <p className="text-xs">Set up your customer portal in Settings to start receiving tickets</p>
                            </div>
                          ) : (
                            "No tickets match your filters"
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />

      {/* Ticket Detail Dialog */}
      <TicketDetailDialog
        ticket={selectedTicket}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};

export default HelpDesk;
