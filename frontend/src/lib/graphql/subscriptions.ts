import { gql } from '@apollo/client';

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($roomId: Int!) {
    messageAdded(roomId: $roomId) {
      id
      roomId
      senderId
      content
      createdAt
      sender {
        id
        username
      }
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
