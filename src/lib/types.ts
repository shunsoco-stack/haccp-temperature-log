export type Slot = "open" | "close";

export type Equipment = {
  id: string;
  name: string;
  kind: "fridge" | "freezer";
  limit: number;
  since: string;
};

export type Staff = { id: string; name: string; initials: string };

export type Response = { category: string; memo: string; temperature: number; at: string };

export type Revision = {
  at: string;
  reason: string;
  previous: number;
  previousStaffId: string;
  previousLimit: number;
  previousResponse?: Response;
};

export type Reading = {
  id: string;
  equipmentId: string;
  date: string;
  slot: Slot;
  temperature: number;
  limit: number;
  staffId: string;
  at: string;
  response?: Response;
  revisions: Revision[];
};

export type Data = {
  version: 1;
  shop: string;
  equipment: Equipment[];
  staff: Staff[];
  readings: Reading[];
};
