import { gql } from '@apollo/client';

export const CALL_FIELDS = `
  id
  roomId
  createdById
  mediaType
  status
  maxParticipants
  createdAt
  endedAt
  targetUserIds
  participants {
    id
    callId
    userId
    joinedAt
    leftAt
    muted
    cameraOff
    user {
      id
      username
      displayName
      avatarUrl
    }
  }
`;

export const START_CALL = gql`
  mutation StartCall($input: StartCallInput!) {
    startCall(input: $input) {
      ${CALL_FIELDS}
    }
  }
`;

export const JOIN_CALL = gql`
  mutation JoinCall($callId: Int!) {
    joinCall(callId: $callId) {
      ${CALL_FIELDS}
    }
  }
`;

export const LEAVE_CALL = gql`
  mutation LeaveCall($callId: Int!) {
    leaveCall(callId: $callId) {
      ${CALL_FIELDS}
    }
  }
`;

export const END_CALL = gql`
  mutation EndCall($callId: Int!) {
    endCall(callId: $callId) {
      ${CALL_FIELDS}
    }
  }
`;

export const SEND_CALL_SIGNAL = gql`
  mutation SendCallSignal($input: SendCallSignalInput!) {
    sendCallSignal(input: $input)
  }
`;

export const UPDATE_CALL_MEDIA = gql`
  mutation UpdateCallMedia($input: UpdateCallMediaInput!) {
    updateCallMedia(input: $input) {
      ${CALL_FIELDS}
    }
  }
`;

export const ACTIVE_CALL_QUERY = gql`
  query ActiveCall($roomId: Int!) {
    activeCall(roomId: $roomId) {
      ${CALL_FIELDS}
    }
  }
`;

export const CALL_UPDATED_SUBSCRIPTION = gql`
  subscription CallUpdated {
    callUpdated {
      ${CALL_FIELDS}
    }
  }
`;

export const CALL_SIGNAL_SUBSCRIPTION = gql`
  subscription CallSignal($callId: Int!) {
    callSignal(callId: $callId) {
      callId
      fromUserId
      toUserId
      signalType
      payload
    }
  }
`;
