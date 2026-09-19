import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      totpEnabled
    }
  }
`;

export const CHECK_EMAIL_QUERY = gql`
  query CheckEmail($email: String!) {
    checkEmail(email: $email) {
      available
      message
    }
  }
`;

export const CHECK_USERNAME_QUERY = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username) {
      available
      message
    }
  }
`;

export const QR_LOGIN_SESSION_QUERY = gql`
  query QrLoginSession($sessionId: String!) {
    qrLoginSession(sessionId: $sessionId) {
      sessionId
      status
      expiresAt
      accessToken
      user {
        id
        username
        email
      }
    }
  }
`;

export const ROOMS_QUERY = gql`
  query Rooms {
    rooms {
      id
      name
      description
      createdById
      createdBy {
        id
        username
      }
      members {
        id
        username
      }
    }
  }
`;

export const MY_ROOMS_QUERY = gql`
  query MyRooms {
    myRooms {
      id
      name
      description
    }
  }
`;

export const MESSAGES_QUERY = gql`
  query Messages($roomId: Int!) {
    messages(roomId: $roomId) {
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

export const NOTIFICATIONS_QUERY = gql`
  query Notifications {
    notifications {
      id
      type
      title
      body
      roomId
      messageId
      isRead
      createdAt
    }
    unreadNotificationCount
  }
`;
