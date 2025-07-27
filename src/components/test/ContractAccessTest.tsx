import React, { useEffect, useState } from 'react';
import { useContractAccess } from '@/hooks/useContractAccess';

/**
 * Test component to manually verify the useContractAccess hook
 * Add this to a page temporarily for testing
 */
export const ContractAccessTest: React.FC = () => {
  const {
    contracts,
    loading,
    error,
    loadContracts,
    shareContract,
    getAccessList,
  } = useContractAccess();

  const [testContractId, setTestContractId] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [accessList, setAccessList] = useState<any[]>([]);

  useEffect(() => {
    // Load contracts on mount
    loadContracts();
  }, [loadContracts]);

  const handleShareTest = async () => {
    if (!testContractId || !testEmail) {
      alert('Please enter contract ID and email');
      return;
    }

    try {
      await shareContract({
        contractId: testContractId,
        userEmails: [testEmail],
        accessLevel: 'viewer',
        permissions: ['view', 'download'],
        message: 'Test sharing via new access control system',
      });
      alert('Access granted successfully!');
    } catch (error) {
      console.error('Share error:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleGetAccessList = async () => {
    if (!testContractId) {
      alert('Please enter contract ID');
      return;
    }

    try {
      const result = await getAccessList(testContractId);
      setAccessList(result);
      console.log('Access list:', result);
    } catch (error) {
      console.error('Get access list error:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className='mx-auto max-w-4xl p-6'>
      <h2 className='mb-6 text-2xl font-bold'>Contract Access Control Test</h2>

      {/* Loading/Error States */}
      {loading && <div className='text-blue-600'>Loading contracts...</div>}
      {error && <div className='text-red-600'>Error: {error}</div>}

      {/* Contracts List */}
      <div className='mb-8'>
        <h3 className='mb-4 text-lg font-semibold'>
          My Contracts ({contracts.length})
        </h3>
        <div className='grid gap-4'>
          {contracts.map(contract => (
            <div key={contract.id} className='rounded border p-4'>
              <div className='font-medium'>{contract.title}</div>
              <div className='text-sm text-gray-600'>ID: {contract.id}</div>
              <div className='text-sm text-gray-600'>
                Status: {contract.status}
              </div>
              <div className='text-sm text-gray-600'>
                Access Level: {contract.userAccess?.accessLevel || 'owner'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Controls */}
      <div className='border-t pt-8'>
        <h3 className='mb-4 text-lg font-semibold'>
          Test Access Control Functions
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='mb-1 block text-sm font-medium'>
              Contract ID:
            </label>
            <input
              type='text'
              value={testContractId}
              onChange={e => setTestContractId(e.target.value)}
              className='w-full rounded border p-2'
              placeholder='Enter contract ID to test'
            />
          </div>

          <div className='flex gap-4'>
            <div className='flex-1'>
              <label className='mb-1 block text-sm font-medium'>
                Email to Share With:
              </label>
              <input
                type='email'
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className='w-full rounded border p-2'
                placeholder='user@example.com'
              />
            </div>
            <div className='flex items-end'>
              <button
                onClick={handleShareTest}
                className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              >
                Test Share Contract
              </button>
            </div>
          </div>

          <div className='flex gap-4'>
            <button
              onClick={handleGetAccessList}
              className='rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700'
            >
              Get Access List
            </button>
            <button
              onClick={() => loadContracts()}
              className='rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700'
            >
              Reload Contracts
            </button>
          </div>
        </div>

        {/* Access List Display */}
        {accessList.length > 0 && (
          <div className='mt-6'>
            <h4 className='mb-2 font-medium'>Access List:</h4>
            <div className='rounded bg-gray-50 p-4'>
              <pre>{JSON.stringify(accessList, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
