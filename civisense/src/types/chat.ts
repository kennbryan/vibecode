export type ChatMessage = {
  id: string;
  body: string;
  verification_count: number;
  flag_count: number;
  is_hidden: boolean;
  is_system: boolean;
  attached_lat: number | null;
  attached_lng: number | null;
  created_at: string;
  viewer_verified: boolean;
  viewer_is_author: boolean;
};

export type ChatMessagesResponse = {
  messages: ChatMessage[];
};

export type ChatMessageMutationResponse = {
  message: ChatMessage;
};

export type ChatUnreadState = {
  count: number;
  hasSevereSystemMessage: boolean;
};
