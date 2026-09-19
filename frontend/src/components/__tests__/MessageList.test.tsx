import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MessageList } from '@/components/MessageList';
import { MESSAGES_QUERY } from '@/lib/graphql/queries';
import { MESSAGE_ADDED_SUBSCRIPTION } from '@/lib/graphql/subscriptions';

const mocks = [
  {
    request: {
      query: MESSAGES_QUERY,
      variables: { roomId: 1 },
    },
    result: {
      data: {
        messages: [
          {
            id: 1,
            roomId: 1,
            senderId: 2,
            content: 'Hello world',
            createdAt: '2026-01-01T12:00:00.000Z',
            sender: { id: 2, username: 'bob' },
          },
        ],
      },
    },
  },
  {
    request: {
      query: MESSAGE_ADDED_SUBSCRIPTION,
      variables: { roomId: 1 },
    },
    result: {
      data: {
        messageAdded: {
          id: 2,
          roomId: 1,
          senderId: 3,
          content: 'later',
          createdAt: '2026-01-01T12:01:00.000Z',
          sender: { id: 3, username: 'cara' },
        },
      },
    },
  },
];

describe('MessageList', () => {
  it('renders messages from the query', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MessageList roomId={1} currentUserId={9} />
      </MockedProvider>,
    );

    expect(await screen.findByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });
});
