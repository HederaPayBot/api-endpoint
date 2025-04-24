export interface User {
  id: string;
  twitterId: string;
  twitterUsername: string;
  hederaAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for users - in a real application, use a database
export class UserStore {
  private users: Map<string, User> = new Map();

  // Create a new user
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const id = Math.random().toString(36).substring(2, 15);
    const newUser: User = {
      id,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(id, newUser);
    return newUser;
  }

  // Get user by ID
  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // Get user by Twitter ID
  getUserByTwitterId(twitterId: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.twitterId === twitterId);
  }

  // Get user by Twitter username
  getUserByTwitterUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(
      user => user.twitterUsername.toLowerCase() === username.toLowerCase()
    );
  }

  // Update user
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Delete user
  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  // Link Hedera account to user
  linkHederaAccount(userId: string, hederaAccountId: string): User | undefined {
    return this.updateUser(userId, { hederaAccountId });
  }

  // Get all users
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

export default new UserStore(); 