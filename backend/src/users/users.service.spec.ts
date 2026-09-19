import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };

  const service = new UsersService(usersRepository as unknown as UsersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a user by id', async () => {
    usersRepository.findById.mockResolvedValue({ id: 1, email: 'a@b.c' });
    await expect(service.findById(1)).resolves.toEqual({ id: 1, email: 'a@b.c' });
  });

  it('throws when user is missing', async () => {
    usersRepository.findById.mockResolvedValue(undefined);
    await expect(service.findById(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('normalizes email on create', async () => {
    usersRepository.create.mockResolvedValue({ id: 1 });
    await service.create({
      email: 'Ada@Example.COM',
      username: 'ada',
      passwordHash: 'hash',
    });
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      username: 'ada',
      passwordHash: 'hash',
      totpEnabled: false,
    });
  });
});
