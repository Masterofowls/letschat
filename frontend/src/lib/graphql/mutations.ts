import { gql } from '@apollo/client';

export const AUTH_FIELDS = `
  accessToken
  requires2FA
  pendingToken
  user {
    id
    email
    username
    displayName
    bio
    avatarUrl
    platform
    totpEnabled
    publicProfilePath
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ${AUTH_FIELDS}
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ${AUTH_FIELDS}
    }
  }
`;

export const VERIFY_2FA_MUTATION = gql`
  mutation Verify2FA($input: Verify2FAInput!) {
    verify2FA(input: $input) {
      ${AUTH_FIELDS}
    }
  }
`;

export const BEGIN_TOTP_SETUP = gql`
  mutation BeginTotpSetup {
    beginTotpSetup {
      secret
      otpauthUrl
    }
  }
`;

export const CONFIRM_TOTP = gql`
  mutation ConfirmTotp($input: ConfirmTotpInput!) {
    confirmTotp(input: $input) {
      id
      totpEnabled
    }
  }
`;

export const DISABLE_TOTP = gql`
  mutation DisableTotp($input: ConfirmTotpInput!) {
    disableTotp(input: $input) {
      id
      totpEnabled
    }
  }
`;

export const BEGIN_PASSKEY_REGISTRATION = gql`
  mutation BeginPasskeyRegistration {
    beginPasskeyRegistration {
      optionsJson
    }
  }
`;

export const FINISH_PASSKEY_REGISTRATION = gql`
  mutation FinishPasskeyRegistration($input: PasskeyResponseInput!) {
    finishPasskeyRegistration(input: $input)
  }
`;

export const BEGIN_PASSKEY_LOGIN = gql`
  mutation BeginPasskeyLogin {
    beginPasskeyLogin {
      optionsJson
    }
  }
`;

export const FINISH_PASSKEY_LOGIN = gql`
  mutation FinishPasskeyLogin($input: PasskeyResponseInput!) {
    finishPasskeyLogin(input: $input) {
      ${AUTH_FIELDS}
    }
  }
`;

export const CREATE_QR_LOGIN = gql`
  mutation CreateQrLoginSession {
    createQrLoginSession {
      sessionId
      expiresAt
      status
    }
  }
`;

export const APPROVE_QR_LOGIN = gql`
  mutation ApproveQrLogin($input: ApproveQrLoginInput!) {
    approveQrLogin(input: $input) {
      sessionId
      status
      accessToken
    }
  }
`;

export const CREATE_ROOM_MUTATION = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      id
      name
      description
      inviteCode
      publicRoomPath
    }
  }
`;

export const JOIN_ROOM_MUTATION = gql`
  mutation JoinRoom($roomId: Int!) {
    joinRoom(roomId: $roomId) {
      id
      name
      inviteCode
      publicRoomPath
    }
  }
`;

export const JOIN_ROOM_BY_INVITE_MUTATION = gql`
  mutation JoinRoomByInvite($inviteCode: String!) {
    joinRoomByInvite(inviteCode: $inviteCode) {
      id
      name
      inviteCode
      publicRoomPath
    }
  }
`;

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($input: FriendUserInput!) {
    sendFriendRequest(input: $input) {
      id
      status
      otherUser {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($input: FriendUserInput!) {
    acceptFriendRequest(input: $input) {
      id
      status
      otherUser {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
`;

export const REMOVE_FRIEND = gql`
  mutation RemoveFriend($input: FriendUserInput!) {
    removeFriend(input: $input)
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
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

export const OPEN_DIRECT_MESSAGE = gql`
  mutation OpenDirectMessage($userId: Int!) {
    openDirectMessage(userId: $userId) {
      id
      name
      isDm
      dmPeer {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      username
      displayName
      bio
      avatarUrl
      platform
      totpEnabled
      publicProfilePath
    }
  }
`;

export const REPORT_PLATFORM_MUTATION = gql`
  mutation ReportPlatform($input: ReportPlatformInput!) {
    reportPlatform(input: $input) {
      id
      platform
    }
  }
`;

export const SET_TYPING_MUTATION = gql`
  mutation SetTyping($input: SetTypingInput!) {
    setTyping(input: $input)
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: Int!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
