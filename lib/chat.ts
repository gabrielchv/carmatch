import { readData, addItem, updateItem, getItemById } from "./db";
import { generateId, nowISO } from "./utils";
import type { Conversation, Message } from "./types";

/**
 * Returns all conversations involving a given user,
 * sorted by updatedAt descending (most recent first).
 */
export function getConversationsForUser(userId: string): Conversation[] {
  const conversations = readData<Conversation>("conversations");
  return conversations
    .filter((c) => c.participantIds.includes(userId))
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

/**
 * Returns a single conversation by ID if the user is a participant.
 * Returns null if not found or not a participant.
 */
export function getConversationById(
  conversationId: string,
  userId: string
): Conversation | null {
  const conv = getItemById<Conversation>("conversations", conversationId);
  if (!conv) return null;
  if (!conv.participantIds.includes(userId)) return null;
  return conv;
}

/**
 * Creates a manual conversation between two users for a given post.
 * Idempotent: if a conversation already exists for this (postId, participant pair),
 * returns the existing one.
 */
export function createManualConversation(
  postId: string,
  ownerId: string,
  initiatorId: string
): Conversation {
  const conversations = readData<Conversation>("conversations");
  const participantIds = [ownerId, initiatorId].sort();

  // Check for existing conversation for this post between these participants
  const existing = conversations.find(
    (c) =>
      c.postId === postId &&
      c.participantIds.length === 2 &&
      c.participantIds.every((id) => participantIds.includes(id))
  );

  if (existing) return existing;

  const now = nowISO();
  const conversation: Conversation = {
    id: generateId(),
    postId,
    participantIds,
    createdAt: now,
    updatedAt: now,
  };

  addItem("conversations", conversation);
  return conversation;
}

/**
 * Creates a conversation from a match. Called inside runMatching().
 * Idempotent: if a conversation already exists for this matchId, returns it.
 */
export function createConversationFromMatch(
  matchId: string,
  postId: string,
  userAId: string,
  userBId: string
): Conversation {
  const conversations = readData<Conversation>("conversations");

  // Check for existing conversation for this match
  const existing = conversations.find((c) => c.matchId === matchId);
  if (existing) return existing;

  const now = nowISO();
  const conversation: Conversation = {
    id: generateId(),
    postId,
    participantIds: [userAId, userBId].sort(),
    matchId,
    createdAt: now,
    updatedAt: now,
  };

  addItem("conversations", conversation);
  return conversation;
}

/**
 * Returns all messages for a conversation, sorted by createdAt ascending.
 * Returns null if the user is not a participant.
 */
export function getMessages(
  conversationId: string,
  userId: string
): Message[] | null {
  const conv = getItemById<Conversation>("conversations", conversationId);
  if (!conv) return null;
  if (!conv.participantIds.includes(userId)) return null;

  const messages = readData<Message>("messages");
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

/**
 * Adds a message to a conversation. Only works if the sender is a participant.
 * Also bumps the conversation's updatedAt timestamp.
 * Returns the new Message, or null if validation fails.
 */
export function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Message | null {
  const conv = getItemById<Conversation>("conversations", conversationId);
  if (!conv) return null;
  if (!conv.participantIds.includes(senderId)) return null;
  if (!text.trim()) return null;

  const now = nowISO();
  const message: Message = {
    id: generateId(),
    conversationId,
    senderId,
    text: text.trim(),
    createdAt: now,
  };

  addItem("messages", message);
  updateItem<Conversation>("conversations", conversationId, { updatedAt: now });

  return message;
}

/**
 * Returns the total count of conversations for a user.
 * Used as a simple unread badge for v0.
 */
export function getConversationCount(userId: string): number {
  const conversations = readData<Conversation>("conversations");
  return conversations.filter((c) => c.participantIds.includes(userId)).length;
}
