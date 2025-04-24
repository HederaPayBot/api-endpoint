export interface Transaction {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  tokenType: string; // 'HBAR' or other token types
  status: 'pending' | 'completed' | 'failed';
  hederaTransactionId?: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for transactions
export class TransactionStore {
  private transactions: Map<string, Transaction> = new Map();

  // Create a new transaction
  createTransaction(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Transaction {
    const id = Math.random().toString(36).substring(2, 15);
    const newTransaction: Transaction = {
      id,
      ...transaction,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  // Get transaction by ID
  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  // Update transaction
  updateTransaction(
    id: string, 
    updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
  ): Transaction | undefined {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction: Transaction = {
      ...transaction,
      ...updates,
      updatedAt: new Date()
    };

    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Complete a transaction
  completeTransaction(id: string, hederaTransactionId: string): Transaction | undefined {
    return this.updateTransaction(id, { 
      status: 'completed', 
      hederaTransactionId 
    });
  }

  // Mark a transaction as failed
  failTransaction(id: string, message: string): Transaction | undefined {
    return this.updateTransaction(id, { 
      status: 'failed', 
      message 
    });
  }

  // Get all transactions by user ID (either sender or recipient)
  getTransactionsByUserId(userId: string): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.senderId === userId || transaction.recipientId === userId
    );
  }

  // Get all transactions
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }
}

export default new TransactionStore(); 