import { z } from "zod";

export const SendMessageSchema = z.object({ body: z.string().trim().min(1, "Write a message").max(1000, "Keep it under 1000 characters") });

export type ChatMessage = { id: string; body: string; createdAt: string; mine: boolean; read: boolean };

export type ChatThreadView = {
  claimId: string;
  claimStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "COMPLETED";
  /** Only PENDING and ACCEPTED handovers accept new messages; the rest stay readable. */
  writable: boolean;
  offerTitle: string;
  otherName: string;
  otherRole: "GIVER" | "TAKER";
  messages: ChatMessage[];
};

export type ChatThreadSummary = {
  claimId: string;
  claimStatus: ChatThreadView["claimStatus"];
  offerTitle: string;
  otherName: string;
  otherRole: "GIVER" | "TAKER";
  lastMessage: string | null;
  lastMine: boolean;
  lastAt: string;
  unread: number;
};

export type ChatInbox = { threads: ChatThreadSummary[]; totalUnread: number };
