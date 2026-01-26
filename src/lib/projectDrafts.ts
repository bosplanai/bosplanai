import type { TaskPriority } from "@/hooks/useTasks";

export type ProjectDraftTask = {
  title: string;
  description: string;
  dueDateISO: string | null;
  priority: TaskPriority;
  assignedUserId: string | null;
};

export type ProjectDraft = {
  id: string;
  title: string;
  description: string;
  dueDateISO: string | null;
  tasks: ProjectDraftTask[];
  createdAtISO: string;
};

const storageKey = (organisationId: string) => `bosplan:projectDrafts:${organisationId}`;

export const getProjectDrafts = (organisationId: string): ProjectDraft[] => {
  try {
    const raw = localStorage.getItem(storageKey(organisationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectDraft[]) : [];
  } catch {
    return [];
  }
};

export const saveProjectDraft = (organisationId: string, draft: ProjectDraft) => {
  const drafts = getProjectDrafts(organisationId);
  const next = [draft, ...drafts.filter((d) => d.id !== draft.id)];
  localStorage.setItem(storageKey(organisationId), JSON.stringify(next));
};

export const deleteProjectDraft = (organisationId: string, draftId: string) => {
  const drafts = getProjectDrafts(organisationId);
  const next = drafts.filter((d) => d.id !== draftId);
  localStorage.setItem(storageKey(organisationId), JSON.stringify(next));
};
