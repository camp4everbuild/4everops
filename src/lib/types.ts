export type UserRole =
  | "director"
  | "head_counselor"
  | "head_support"
  | "head_kitchen"
  | "counselor"
  | "support_staff"
  | "kitchen_staff";
export type Department = "counselors" | "support" | "kitchen";
export const DEPARTMENT_LABELS: Record<Department, string> = {
  counselors: "Counselors",
  support: "Support",
  kitchen: "Kitchen",
};
export type ProfileStatus = "pending" | "active";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type JobStatus = "open" | "claimed" | "in_progress" | "completed";

export const ROLE_LABELS: Record<UserRole, string> = {
  director: "Director",
  head_counselor: "Head Counselor",
  head_support: "Head Support",
  head_kitchen: "Head Kitchen",
  counselor: "Counselor",
  support_staff: "Support Staff",
  kitchen_staff: "Kitchen Staff",
};

/** Which department a role belongs to. Director isn't tied to one — oversight applies everywhere. */
export const ROLE_DEPARTMENT: Partial<Record<UserRole, Department>> = {
  head_counselor: "counselors",
  counselor: "counselors",
  head_support: "support",
  support_staff: "support",
  head_kitchen: "kitchen",
  kitchen_staff: "kitchen",
};

export const OVERSIGHT_ROLES: UserRole[] = [
  "director",
  "head_counselor",
  "head_support",
  "head_kitchen",
];

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  /** Empty until a director approves the account and assigns at least one role. */
  roles: UserRole[];
  status: ProfileStatus;
  department: string | null;
  tshirt_size: string | null;
  room_assignment: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OpenJob = {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  created_by: string;
  claimed_by: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Checklist = {
  id: string;
  name: string;
  checklist_date: string;
  created_by: string;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  title: string;
  department: Department;
  assigned_to: string | null;
  is_complete: boolean;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type ChecklistTemplateItem = {
  id: string;
  template_id: string;
  title: string;
  department: Department;
  sort_order: number;
};

export type ScheduleStop = {
  id: string;
  travel_date: string;
  label: string;
  address: string;
  time: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
};

export type ScheduleStopWithAssignee = ScheduleStop & {
  assignee: Pick<Profile, "id" | "full_name" | "phone"> | null;
};

/** A CSV row waiting for a director/head to post it as an open job or assign it to someone — nothing here is staff-facing yet. */
export type PendingImport = {
  id: string;
  title: string;
  description: string | null;
  batch_label: string;
  created_by: string;
  created_at: string;
};

/** A physical, numbered cot/mattress — a fixed roster, not an event log. Checked out/in, not "logged" per use. */
export type Cot = {
  id: string;
  number: number;
  is_out: boolean;
  room_or_group: string | null;
  given_at: string | null;
  given_by: string | null;
  returned_at: string | null;
  returned_by: string | null;
  created_at: string;
};

export type Camper = {
  id: string;
  full_name: string;
  counselor_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  tshirt_size: string | null;
  cabin_group: string | null;
  created_at: string;
};

export type CamperNote = {
  camper_id: string;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_by: string;
  requires_ack: boolean;
  created_at: string;
};

export type AnnouncementAck = {
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
};

export type TravelDay = {
  id: string;
  travel_date: string;
  hotel_name: string | null;
  hotel_address: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  departure_time: string | null;
  meeting_location: string | null;
  itinerary: string | null;
  created_by: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type:
    | "task_assigned"
    | "task_completed"
    | "job_posted"
    | "job_assigned"
    | "job_status_change"
    | "announcement"
    | "deadline"
    | "schedule_change";
  title: string;
  body: string | null;
  related_table: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

/** Rows joined with the assignee/creator profile, as returned by our queries. */
export type TaskWithPeople = Task & {
  assignee: Pick<Profile, "id" | "full_name" | "phone"> | null;
  assigner: Pick<Profile, "id" | "full_name" | "phone"> | null;
};

export type OpenJobWithPeople = OpenJob & {
  creator: Pick<Profile, "id" | "full_name" | "phone"> | null;
  claimer: Pick<Profile, "id" | "full_name" | "phone"> | null;
};

export type ChecklistItemWithAssignee = ChecklistItem & {
  assignee: Pick<Profile, "id" | "full_name"> | null;
};
