import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { AuthForm } from '@/components/AuthForm';
import { LOGIN_MUTATION, REGISTER_MUTATION } from '@/lib/graphql/mutations';
import { CHECK_EMAIL_QUERY, CHECK_USERNAME_QUERY } from '@/lib/graphql/queries';

const mocks = [
  {
    request: {
      query: LOGIN_MUTATION,
      variables: {
        input: { email: 'ada@example.com', password: 'secret1' },
      },
    },
    result: {
      data: {
        login: {
          accessToken: 'jwt-token',
          requires2FA: false,
          pendingToken: null,
          user: { id: 1, email: 'ada@example.com', username: 'ada', totpEnabled: false },
        },
      },
    },
  },
  {
    request: {
      query: CHECK_EMAIL_QUERY,
      variables: { email: 'new@example.com' },
    },
    result: {
      data: { checkEmail: { available: true, message: 'Email looks good' } },
    },
  },
  {
    request: {
      query: CHECK_USERNAME_QUERY,
      variables: { username: 'newbie' },
    },
    result: {
      data: { checkUsername: { available: true, message: 'Username is available' } },
    },
  },
  {
    request: {
      query: REGISTER_MUTATION,
      variables: {
        input: {
          email: 'new@example.com',
          username: 'newbie',
          password: 'Secret1x!',
        },
      },
    },
    result: {
      data: {
        register: {
          accessToken: 'jwt-token-2',
          requires2FA: false,
          pendingToken: null,
          user: {
            id: 2,
            email: 'new@example.com',
            username: 'newbie',
            totpEnabled: false,
          },
        },
      },
    },
  },
];

describe('AuthForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('signs in and stores the access token', async () => {
    const onSuccess = jest.fn();
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <AuthForm onSuccess={onSuccess} />
      </MockedProvider>,
    );

    await user.type(document.getElementById('email') as HTMLInputElement, 'ada@example.com');
    await user.type(document.getElementById('password') as HTMLInputElement, 'secret1');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(localStorage.getItem('letschat_token')).toBe('jwt-token');
    });
  });

  it('switches to register and creates an account', async () => {
    const onSuccess = jest.fn();
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <AuthForm onSuccess={onSuccess} />
      </MockedProvider>,
    );

    await user.click(screen.getByRole('tab', { name: /create account/i }));
    await user.click(document.getElementById('reg-email') as HTMLInputElement);
    await user.paste('new@example.com');
    await user.click(document.getElementById('username') as HTMLInputElement);
    await user.paste('newbie');
    await user.click(document.getElementById('reg-password') as HTMLInputElement);
    await user.paste('Secret1x!');

    await waitFor(() => {
      expect(screen.getAllByText(/email looks good/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/username is available/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(localStorage.getItem('letschat_token')).toBe('jwt-token-2');
    });
  });
});
