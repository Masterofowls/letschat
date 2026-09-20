import { gql } from '@apollo/client';

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($roomId: Int!) {
    messageAdded(roomId: $roomId) {
      id
      roomId
      senderId
      content
      replyToId
      createdAt
      replyTo {
        id
        content
        senderId
        sender {
          id
          username
          displayName
        }
      }
      sender {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
`;

export const TYPING_UPDATED_SUBSCRIPTION = gql`
  subscription TypingUpdated($roomId: Int!) {
    typingUpdated(roomId: $roomId) {
      roomId
      userId
      username
      isTyping
    }
  }
`;

export const NOTIFICATION_ADDED_SUBSCRIPTION = gql`
  subscription NotificationAdded {
    notificationAdded {
      id
      type
      title
      body
      roomId
      messageId
      isRead
      createdAt
    }
  }
`;
