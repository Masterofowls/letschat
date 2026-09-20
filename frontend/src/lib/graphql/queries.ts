import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      displayName
      bio
      avatarUrl
      platform
      totpEnabled
      publicProfilePath
      createdAt
    }
  }
`;

export const PUBLIC_PROFILE_QUERY = gql`
  query PublicProfile($username: String!) {
    publicProfile(username: $username) {
      id
      username
      displayName
      bio
      avatarUrl
      platform
      createdAt
      publicProfilePath
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
      inviteCode
      publicRoomPath
      isDm
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
      inviteCode
      publicRoomPath
      isDm
    }
  }
`;

export const MY_DIRECT_MESSAGES_QUERY = gql`
  query MyDirectMessages {
    myDirectMessages {
      id
      name
      isDm
      dmPeer {
        id
        username
        displayName
        avatarUrl
        publicProfilePath
      }
    }
  }
`;

export const ROOM_BY_INVITE_QUERY = gql`
  query RoomByInvite($inviteCode: String!) {
    roomByInvite(inviteCode: $inviteCode) {
      id
      name
      description
      inviteCode
      publicRoomPath
      members {
        id
        username
      }
    }
  }
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      username
      displayName
      bio
      avatarUrl
      platform
      publicProfilePath
      friendshipStatus
    }
  }
`;

export const SEARCH_ROOMS_QUERY = gql`
  query SearchRooms($query: String!) {
    searchRooms(query: $query) {
      id
      name
      description
      inviteCode
      publicRoomPath
    }
  }
`;

export const FRIENDS_QUERY = gql`
  query Friends {
    friends {
      id
      status
      otherUser {
        id
        username
        displayName
        avatarUrl
        publicProfilePath
        platform
      }
    }
  }
`;

export const FRIEND_REQUESTS_QUERY = gql`
  query FriendRequests {
    friendRequests {
      id
      status
      requester {
        id
        username
        displayName
        avatarUrl
      }
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
