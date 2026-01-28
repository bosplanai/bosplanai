import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { 
  Users, Briefcase, CheckSquare, CalendarDays, Search, Filter, 
  Plus, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import bosplanLogo from "@/assets/bosplan-logo-icon.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SideNavigation from "@/components/SideNavigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { useCases, CRMCase } from "@/hooks/useCases";
import { useActivities, CRMActivity } from "@/hooks/useActivities";
import { useMeetings, CRMMeeting } from "@/hooks/useMeetings";
import { ContactProfileSheet, CRMContact } from "@/components/crm/ContactProfileSheet";
import { CreateContactDialog } from "@/components/crm/CreateContactDialog";
import { CaseProfileSheet } from "@/components/crm/CaseProfileSheet";
import { CreateCaseDialog } from "@/components/crm/CreateCaseDialog";
import { ActivityProfileSheet } from "@/components/crm/ActivityProfileSheet";
import { CreateActivityDialog } from "@/components/crm/CreateActivityDialog";
import { MeetingProfileSheet } from "@/components/crm/MeetingProfileSheet";
import { CreateMeetingDialog } from "@/components/crm/CreateMeetingDialog";
import { format } from "date-fns";

// CRM Sidebar navigation items
const crmNavItems = [
  { id: "contacts", icon: Users, label: "Contacts" },
  { id: "cases", icon: Briefcase, label: "Cases" },
  { id: "activities", icon: CheckSquare, label: "Activities" },
  { id: "meetings", icon: CalendarDays, label: "Meetings" },
];

const contactStatusOptions = [
  { value: "active", label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "pending", label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "closed", label: "Closed", className: "bg-muted text-muted-foreground border-border" },
];

const caseStatusOptions = [
  { value: "new", label: "New", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "open", label: "Open", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "in_progress", label: "In Progress", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "escalated", label: "Escalated", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  { value: "closed", label: "Closed", className: "bg-muted text-muted-foreground border-border" },
];

const casePriorityOptions = [
  { value: "low", label: "Low", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  { value: "medium", label: "Medium", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "high", label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: "critical", label: "Critical", className: "bg-red-500/10 text-red-600 border-red-500/20" },
];

const activityStatusOptions = [
  { value: "not_started", label: "Not Started", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  { value: "in_progress", label: "In Progress", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "completed", label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "waiting", label: "Waiting", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "deferred", label: "Deferred", className: "bg-muted text-muted-foreground border-border" },
];

const activityPriorityOptions = [
  { value: "low", label: "Low", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  { value: "normal", label: "Normal", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "high", label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
];

const meetingStatusOptions = [
  { value: "scheduled", label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "completed", label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "cancelled", label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  { value: "rescheduled", label: "Rescheduled", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
];

const getContactStatusConfig = (status: string) => {
  const found = contactStatusOptions.find(s => s.value === status);
  return found || { label: status || "Active", className: "bg-muted text-muted-foreground border-border" };
};

const getCaseStatusConfig = (status: string) => {
  const found = caseStatusOptions.find(s => s.value === status);
  return found || { label: status || "New", className: "bg-muted text-muted-foreground border-border" };
};

const getCasePriorityConfig = (priority: string) => {
  const found = casePriorityOptions.find(p => p.value === priority);
  return found || { label: priority || "Medium", className: "bg-muted text-muted-foreground border-border" };
};

const getActivityStatusConfig = (status: string) => {
  const found = activityStatusOptions.find(s => s.value === status);
  return found || { label: status || "Not Started", className: "bg-muted text-muted-foreground border-border" };
};

const getActivityPriorityConfig = (priority: string) => {
  const found = activityPriorityOptions.find(p => p.value === priority);
  return found || { label: priority || "Normal", className: "bg-muted text-muted-foreground border-border" };
};

const getMeetingStatusConfig = (status: string) => {
  const found = meetingStatusOptions.find(s => s.value === status);
  return found || { label: status || "Scheduled", className: "bg-muted text-muted-foreground border-border" };
};

const CRM = () => {
  const { navigate } = useOrgNavigation();
  const { organization } = useOrganization();
  const { customers, isLoading, addCustomer, updateCustomer } = useCustomers();
  const { cases, isLoading: casesLoading, addCase, updateCase } = useCases();
  const { activities, isLoading: activitiesLoading, addActivity, updateActivity } = useActivities();
  const { meetings, isLoading: meetingsLoading, addMeeting, updateMeeting } = useMeetings();
  const [activeNav, setActiveNav] = useState("contacts");
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [caseStatusFilters, setCaseStatusFilters] = useState<string[]>([]);
  const [casePriorityFilters, setCasePriorityFilters] = useState<string[]>([]);
  const [activityStatusFilters, setActivityStatusFilters] = useState<string[]>([]);
  const [activityPriorityFilters, setActivityPriorityFilters] = useState<string[]>([]);
  const [meetingStatusFilters, setMeetingStatusFilters] = useState<string[]>([]);
  const [recordsPerPage, setRecordsPerPage] = useState("25");
  
  // Contact profile sheet state
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  
  // Create contact dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Case profile sheet state
  const [selectedCase, setSelectedCase] = useState<CRMCase | null>(null);
  const [caseSheetOpen, setCaseSheetOpen] = useState(false);
  
  // Create case dialog state
  const [createCaseDialogOpen, setCreateCaseDialogOpen] = useState(false);

  // Activity profile sheet state
  const [selectedActivity, setSelectedActivity] = useState<CRMActivity | null>(null);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  
  // Create activity dialog state
  const [createActivityDialogOpen, setCreateActivityDialogOpen] = useState(false);

  // Meeting profile sheet state
  const [selectedMeeting, setSelectedMeeting] = useState<CRMMeeting | null>(null);
  const [meetingSheetOpen, setMeetingSheetOpen] = useState(false);
  
  // Create meeting dialog state
  const [createMeetingDialogOpen, setCreateMeetingDialogOpen] = useState(false);

  // Get unique values for source filter options
  const uniqueSources = [...new Set(customers.map(c => c.enquiry_source).filter(Boolean))] as string[];

  // Filter contacts based on search and filters
  const filteredContacts = customers.filter((contact) => {
    // Main search bar filter
    const firstName = contact.first_name || "";
    const lastName = contact.last_name || "";
    const matchesSearch = searchQuery === "" || 
      firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter sidebar search - searches within filter panel context
    const matchesFilterSearch = filterSearch === "" ||
      firstName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      lastName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      contact.email.toLowerCase().includes(filterSearch.toLowerCase()) ||
      contact.company_name.toLowerCase().includes(filterSearch.toLowerCase());
    
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(contact.status || "active");
    const matchesSource = sourceFilters.length === 0 || (contact.enquiry_source && sourceFilters.includes(contact.enquiry_source));
    
    return matchesSearch && matchesFilterSearch && matchesStatus && matchesSource;
  });

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleSourceFilter = (source: string) => {
    setSourceFilters(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleCaseStatusFilter = (status: string) => {
    setCaseStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleCasePriorityFilter = (priority: string) => {
    setCasePriorityFilters(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleActivityStatusFilter = (status: string) => {
    setActivityStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleActivityPriorityFilter = (priority: string) => {
    setActivityPriorityFilters(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleContactClick = (contact: Customer) => {
    setSelectedContact(contact as CRMContact);
    setProfileSheetOpen(true);
  };

  const handleSaveContact = async (contact: Partial<CRMContact> & { id: string }) => {
    await updateCustomer.mutateAsync(contact);
  };

  const handleCreateContact = async (formData: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    company_name: string;
    address: string;
    enquiry_source: string;
    additional_info: string;
    notes: string;
    status: string;
  }) => {
    await addCustomer.mutateAsync({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      mobile: formData.mobile,
      company_name: formData.company_name,
      address: formData.address,
      enquiry_source: formData.enquiry_source,
      additional_info: formData.additional_info,
      notes: formData.notes,
      status: formData.status,
    });
  };

  // Cases filtering
  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch = searchQuery === "" || 
      caseItem.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (caseItem.email && caseItem.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCaseStatus = caseStatusFilters.length === 0 || caseStatusFilters.includes(caseItem.status);
    const matchesCasePriority = casePriorityFilters.length === 0 || casePriorityFilters.includes(caseItem.priority);
    
    return matchesSearch && matchesCaseStatus && matchesCasePriority;
  });

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const toggleAllCases = () => {
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(filteredCases.map(c => c.id));
    }
  };

  const handleCaseClick = (caseItem: CRMCase) => {
    setSelectedCase(caseItem);
    setCaseSheetOpen(true);
  };

  const handleSaveCase = async (caseData: Partial<CRMCase> & { id: string }) => {
    await updateCase.mutateAsync(caseData);
  };

  const handleCreateCase = async (formData: {
    subject: string;
    status: string;
    priority: string;
    type: string;
    case_origin: string;
    product_name: string;
    email: string;
    phone: string;
    reported_by: string;
    customer_id: string;
    assigned_to: string;
    description: string;
  }) => {
    await addCase.mutateAsync({
      subject: formData.subject,
      status: formData.status,
      priority: formData.priority,
      type: formData.type || undefined,
      case_origin: formData.case_origin || undefined,
      product_name: formData.product_name || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      reported_by: formData.reported_by || undefined,
      customer_id: formData.customer_id || undefined,
      assigned_to: formData.assigned_to || undefined,
      description: formData.description || undefined,
    });
  };

  // Activities filtering
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = searchQuery === "" || 
      activity.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.activity_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesActivityStatus = activityStatusFilters.length === 0 || activityStatusFilters.includes(activity.status);
    const matchesActivityPriority = activityPriorityFilters.length === 0 || activityPriorityFilters.includes(activity.priority);
    
    return matchesSearch && matchesActivityStatus && matchesActivityPriority;
  });

  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const toggleAllActivities = () => {
    if (selectedActivities.length === filteredActivities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(filteredActivities.map(a => a.id));
    }
  };

  const handleActivityClick = (activity: CRMActivity) => {
    setSelectedActivity(activity);
    setActivitySheetOpen(true);
  };

  const handleSaveActivity = async (activityData: Partial<CRMActivity> & { id: string }) => {
    await updateActivity.mutateAsync(activityData);
  };

  const handleCreateActivity = async (formData: {
    subject: string;
    status: string;
    priority: string;
    type: string;
    due_date: string;
    customer_id: string;
    assigned_to: string;
    description: string;
  }) => {
    await addActivity.mutateAsync({
      subject: formData.subject,
      status: formData.status,
      priority: formData.priority,
      type: formData.type || undefined,
      due_date: formData.due_date || undefined,
      customer_id: formData.customer_id || undefined,
      assigned_to: formData.assigned_to || undefined,
      description: formData.description || undefined,
    });
  };

  // Meetings filtering
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = searchQuery === "" || 
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.meeting_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMeetingStatus = meetingStatusFilters.length === 0 || meetingStatusFilters.includes(meeting.status);
    
    return matchesSearch && matchesMeetingStatus;
  });

  const toggleMeetingSelection = (meetingId: string) => {
    setSelectedMeetings(prev => 
      prev.includes(meetingId) 
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const toggleAllMeetings = () => {
    if (selectedMeetings.length === filteredMeetings.length) {
      setSelectedMeetings([]);
    } else {
      setSelectedMeetings(filteredMeetings.map(m => m.id));
    }
  };

  const toggleMeetingStatusFilter = (status: string) => {
    setMeetingStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleMeetingClick = (meeting: CRMMeeting) => {
    setSelectedMeeting(meeting);
    setMeetingSheetOpen(true);
  };

  const handleSaveMeeting = async (meetingData: Partial<CRMMeeting> & { id: string }) => {
    await updateMeeting.mutateAsync(meetingData);
  };

  const handleCreateMeeting = async (formData: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    meeting_venue?: string;
    customer_id?: string;
    assigned_to?: string;
    status?: string;
  }) => {
    await addMeeting.mutateAsync({
      title: formData.title,
      description: formData.description,
      start_time: formData.start_time,
      end_time: formData.end_time,
      meeting_venue: formData.meeting_venue,
      customer_id: formData.customer_id,
      assigned_to: formData.assigned_to,
      status: formData.status,
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* CRM Left Sidebar - hidden on mobile */}
      <div className="hidden md:flex w-52 bg-brand-teal flex-col">
        {/* Header */}
        <div className="p-4 flex items-center gap-2">
          <button 
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <img src={bosplanLogo} alt="Bosplan" className="w-6 h-6" />
          <span className="text-white font-semibold">CRM</span>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Search"
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2">
          {crmNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                  isActive
                    ? "bg-white text-brand-teal"
                    : "text-white/90 hover:bg-white/10"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile header bar */}
      <div className="md:hidden bg-brand-teal px-4 py-3 flex items-center gap-3 overflow-x-auto">
        <button 
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <img src={bosplanLogo} alt="Bosplan" className="w-6 h-6" />
          <span className="text-white font-semibold text-sm">CRM</span>
        </div>
        {crmNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                isActive
                  ? "bg-white text-brand-teal"
                  : "text-white/90 bg-white/10"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 sm:h-14">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 text-xs sm:text-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{showFilters ? "Hide Filters" : "Show Filters"}</span>
              <span className="sm:hidden">Filter</span>
            </Button>
            
            {activeNav === "contacts" && (
              <>
                <Select defaultValue="all">
                  <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                    <SelectValue placeholder="All Contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contacts</SelectItem>
                    <SelectItem value="my">My Contacts</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{filteredContacts.length}</span>
                </span>
              </>
            )}

            {activeNav === "cases" && (
              <>
                <Select defaultValue="all">
                  <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                    <SelectValue placeholder="All Cases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cases</SelectItem>
                    <SelectItem value="my">My Cases</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{filteredCases.length}</span>
                </span>
              </>
            )}

            {activeNav === "activities" && (
              <>
                <Select defaultValue="all">
                  <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="my">My Activities</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{filteredActivities.length}</span>
                </span>
              </>
            )}

            {activeNav === "meetings" && (
              <>
                <Select defaultValue="all">
                  <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                    <SelectValue placeholder="All Meetings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meetings</SelectItem>
                    <SelectItem value="my">My Meetings</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{filteredMeetings.length}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeNav === "contacts" && (
              <Button 
                className="gap-2 bg-brand-teal hover:bg-brand-teal/90 text-xs sm:text-sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Contact</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            {activeNav === "cases" && (
              <Button 
                className="gap-2 bg-brand-teal hover:bg-brand-teal/90 text-xs sm:text-sm"
                onClick={() => setCreateCaseDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Case</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            {activeNav === "activities" && (
              <Button 
                className="gap-2 bg-brand-teal hover:bg-brand-teal/90 text-xs sm:text-sm"
                onClick={() => setCreateActivityDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Activity</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            {activeNav === "meetings" && (
              <Button 
                className="gap-2 bg-brand-teal hover:bg-brand-teal/90 text-xs sm:text-sm"
                onClick={() => setCreateMeetingDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Meeting</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Filter Sidebar - collapsible on mobile */}
          {showFilters && (
            <div className="md:w-64 border-b md:border-b-0 md:border-r border-border p-4 overflow-y-auto max-h-48 md:max-h-none">
              {activeNav === "contacts" && (
                <>
                  <h3 className="font-medium text-sm mb-3 md:mb-4">Filter Contacts by</h3>
                  
                  {/* Filter Search */}
                  <div className="relative mb-3 md:mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>

                  <div className="flex md:flex-col gap-4 md:gap-0 overflow-x-auto md:overflow-visible">
                    {/* Status Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Status
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {contactStatusOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={statusFilters.includes(opt.value)}
                              onCheckedChange={() => toggleStatusFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Source Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Source
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6 max-h-48 overflow-y-auto">
                        {uniqueSources.length > 0 ? uniqueSources.map((source) => (
                          <label key={source} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={sourceFilters.includes(source)}
                              onCheckedChange={() => toggleSourceFilter(source)}
                            />
                            <span>{source}</span>
                          </label>
                        )) : (
                          <span className="text-xs text-muted-foreground">No sources available</span>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </>
              )}

              {activeNav === "cases" && (
                <>
                  <h3 className="font-medium text-sm mb-3 md:mb-4">Filter Cases by</h3>

                  <div className="flex md:flex-col gap-4 md:gap-0 overflow-x-auto md:overflow-visible">
                    {/* Status Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Status
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {caseStatusOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={caseStatusFilters.includes(opt.value)}
                              onCheckedChange={() => toggleCaseStatusFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Priority Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Priority
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {casePriorityOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={casePriorityFilters.includes(opt.value)}
                              onCheckedChange={() => toggleCasePriorityFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </>
              )}

              {activeNav === "activities" && (
                <>
                  <h3 className="font-medium text-sm mb-3 md:mb-4">Filter Activities by</h3>

                  <div className="flex md:flex-col gap-4 md:gap-0 overflow-x-auto md:overflow-visible">
                    {/* Status Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Status
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {activityStatusOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={activityStatusFilters.includes(opt.value)}
                              onCheckedChange={() => toggleActivityStatusFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Priority Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Priority
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {activityPriorityOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={activityPriorityFilters.includes(opt.value)}
                              onCheckedChange={() => toggleActivityPriorityFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </>
              )}

              {activeNav === "meetings" && (
                <>
                  <h3 className="font-medium text-sm mb-3 md:mb-4">Filter Meetings by</h3>

                  <div className="flex md:flex-col gap-4 md:gap-0 overflow-x-auto md:overflow-visible">
                    {/* Status Filter */}
                    <Collapsible defaultOpen className="mb-0 md:mb-4 shrink-0">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium mb-2">
                        <ChevronDown className="w-4 h-4" />
                        Status
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pl-6">
                        {meetingStatusOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={meetingStatusFilters.includes(opt.value)}
                              onCheckedChange={() => toggleMeetingStatusFilter(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Contacts Table */}
          {activeNav === "contacts" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table Header Controls */}
              <div className="flex items-center justify-end gap-2 p-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Records per page</span>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-4">
                  1 - {Math.min(parseInt(recordsPerPage), filteredContacts.length)}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onCheckedChange={toggleAllContacts}
                        />
                      </th>
                      <th className="p-3">First Name</th>
                      <th className="p-3">Last Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContacts.map((contact) => {
                      const statusConfig = getContactStatusConfig(contact.status || "active");
                      return (
                        <tr key={contact.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleContactSelection(contact.id)}
                            />
                          </td>
                          <td className="p-3">
                            <span 
                              className="text-brand-teal font-medium cursor-pointer hover:underline"
                              onClick={() => handleContactClick(contact)}
                            >
                              {contact.first_name || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-sm">{contact.last_name || "-"}</td>
                          <td className="p-3 text-sm text-muted-foreground">{contact.email}</td>
                          <td className="p-3 text-sm text-brand-teal truncate max-w-[180px]" title={contact.company_name}>
                            {contact.company_name || "-"}
                          </td>
                          <td className="p-3 text-sm">{contact.mobile || contact.phone || "-"}</td>
                          <td className="p-3 text-sm">{contact.enquiry_source || "-"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                              {statusConfig.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cases Table */}
          {activeNav === "cases" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table Header Controls */}
              <div className="flex items-center justify-end gap-2 p-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Records per page</span>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-4">
                  1 - {Math.min(parseInt(recordsPerPage), filteredCases.length)}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                          onCheckedChange={toggleAllCases}
                        />
                      </th>
                      <th className="p-3">Case Number</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Related Contact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCases.map((caseItem) => {
                      const statusConfig = getCaseStatusConfig(caseItem.status);
                      const priorityConfig = getCasePriorityConfig(caseItem.priority);
                      return (
                        <tr key={caseItem.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedCases.includes(caseItem.id)}
                              onCheckedChange={() => toggleCaseSelection(caseItem.id)}
                            />
                          </td>
                          <td className="p-3">
                            <span 
                              className="text-brand-teal font-medium cursor-pointer hover:underline"
                              onClick={() => handleCaseClick(caseItem)}
                            >
                              {caseItem.case_number}
                            </span>
                          </td>
                          <td className="p-3 text-sm max-w-[200px] truncate" title={caseItem.subject}>
                            {caseItem.subject}
                          </td>
                          <td className="p-3 text-sm text-brand-teal">
                            {caseItem.customer 
                              ? `${caseItem.customer.first_name || ""} ${caseItem.customer.last_name || ""}`.trim() || caseItem.customer.email
                              : "-"}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm capitalize">{caseItem.type?.replace("_", " ") || "-"}</td>
                          <td className="p-3 text-sm capitalize">{caseItem.case_origin?.replace("_", " ") || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activities Table */}
          {activeNav === "activities" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table Header Controls */}
              <div className="flex items-center justify-end gap-2 p-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Records per page</span>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-4">
                  1 - {Math.min(parseInt(recordsPerPage), filteredActivities.length)}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectedActivities.length === filteredActivities.length && filteredActivities.length > 0}
                          onCheckedChange={toggleAllActivities}
                        />
                      </th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Related To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActivities.map((activity) => {
                      const statusConfig = getActivityStatusConfig(activity.status);
                      const priorityConfig = getActivityPriorityConfig(activity.priority);
                      return (
                        <tr key={activity.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedActivities.includes(activity.id)}
                              onCheckedChange={() => toggleActivitySelection(activity.id)}
                            />
                          </td>
                          <td className="p-3">
                            <span 
                              className="text-brand-teal font-medium cursor-pointer hover:underline max-w-[250px] truncate block"
                              onClick={() => handleActivityClick(activity)}
                              title={activity.subject}
                            >
                              {activity.subject}
                            </span>
                          </td>
                          <td className="p-3 text-sm">
                            {activity.due_date 
                              ? format(new Date(activity.due_date), "d MMM, yyyy")
                              : "-"}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-brand-teal">
                            {activity.customer 
                              ? `${activity.customer.first_name || ""} ${activity.customer.last_name || ""}`.trim() || activity.customer.email
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Meetings Table */}
          {activeNav === "meetings" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table Header Controls */}
              <div className="flex items-center justify-end gap-2 p-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Records per page</span>
                <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-4">
                  1 - {Math.min(parseInt(recordsPerPage), filteredMeetings.length)}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectedMeetings.length === filteredMeetings.length && filteredMeetings.length > 0}
                          onCheckedChange={toggleAllMeetings}
                        />
                      </th>
                      <th className="p-3">Title</th>
                      <th className="p-3">From</th>
                      <th className="p-3">To</th>
                      <th className="p-3">Related To</th>
                      <th className="p-3">Meeting Venue</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMeetings.map((meeting) => {
                      const statusConfig = getMeetingStatusConfig(meeting.status);
                      return (
                        <tr key={meeting.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedMeetings.includes(meeting.id)}
                              onCheckedChange={() => toggleMeetingSelection(meeting.id)}
                            />
                          </td>
                          <td className="p-3">
                            <span 
                              className="text-brand-teal font-medium cursor-pointer hover:underline max-w-[250px] truncate block"
                              onClick={() => handleMeetingClick(meeting)}
                              title={meeting.title}
                            >
                              {meeting.title}
                            </span>
                          </td>
                          <td className="p-3 text-sm">
                            {meeting.start_time 
                              ? format(new Date(meeting.start_time), "d MMM, yyyy hh:mm a")
                              : "-"}
                          </td>
                          <td className="p-3 text-sm">
                            {meeting.end_time 
                              ? format(new Date(meeting.end_time), "d MMM, yyyy hh:mm a")
                              : "-"}
                          </td>
                          <td className="p-3 text-sm text-brand-teal">
                            {meeting.customer 
                              ? `${meeting.customer.first_name || ""} ${meeting.customer.last_name || ""}`.trim() || meeting.customer.email
                              : "-"}
                          </td>
                          <td className="p-3 text-sm">{meeting.meeting_venue || "-"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                              {statusConfig.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <SideNavigation />

      {/* Contact Profile Sheet */}
      <ContactProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        contact={selectedContact}
        onSave={handleSaveContact}
      />

      {/* Create Contact Dialog */}
      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateContact}
      />

      {/* Case Profile Sheet */}
      <CaseProfileSheet
        open={caseSheetOpen}
        onOpenChange={setCaseSheetOpen}
        caseData={selectedCase}
        onSave={handleSaveCase}
      />

      {/* Create Case Dialog */}
      <CreateCaseDialog
        open={createCaseDialogOpen}
        onOpenChange={setCreateCaseDialogOpen}
        onCreate={handleCreateCase}
      />

      {/* Activity Profile Sheet */}
      <ActivityProfileSheet
        open={activitySheetOpen}
        onOpenChange={setActivitySheetOpen}
        activityData={selectedActivity}
        onSave={handleSaveActivity}
      />

      {/* Create Activity Dialog */}
      <CreateActivityDialog
        open={createActivityDialogOpen}
        onOpenChange={setCreateActivityDialogOpen}
        onCreate={handleCreateActivity}
      />

      {/* Meeting Profile Sheet */}
      <MeetingProfileSheet
        open={meetingSheetOpen}
        onOpenChange={setMeetingSheetOpen}
        meetingData={selectedMeeting}
        onSave={handleSaveMeeting}
      />

      {/* Create Meeting Dialog */}
      <CreateMeetingDialog
        open={createMeetingDialogOpen}
        onOpenChange={setCreateMeetingDialogOpen}
        onCreate={handleCreateMeeting}
      />
    </div>
  );
};

export default CRM;
