import mongoose from 'mongoose';

/**
 * Checks if the current MongoDB connection topology supports ACID transactions.
 * Transactions require a replica set or sharded cluster.
 */
export const isTransactionSupported = () => {
  const topology = mongoose.connection?.client?.topology;
  const type = topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
};

/**
 * Executes a callback function inside a MongoDB session transaction if supported.
 * If requireTransaction is true and transactions are unsupported, throws an error rather than falling back.
 *
 * @param {Function} callback - Async function receiving (session)
 * @param {Object} options - { requireTransaction: boolean }
 * @returns {Promise<any>} Result of callback
 */
export const withTransaction = async (callback, options = {}) => {
  const supported = isTransactionSupported();

  if (!supported) {
    if (options.requireTransaction) {
      const err = new Error('Transactions are not supported on this MongoDB topology (requires replica set or sharded cluster)');
      err.statusCode = 500;
      throw err;
    }
    // Execute without transaction session
    return await callback(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore abort error
    }
    throw err;
  } finally {
    session.endSession();
  }
};
