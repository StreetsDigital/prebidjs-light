import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog } from '../../components/ui';
import { UserTableRow } from '../../components/UserTableRow';
import { CreateUserModal } from '../../components/CreateUserModal';
import { EditUserModal } from '../../components/EditUserModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string | null;
}

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId: string;
}

interface EditUserForm {
  name: string;
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId: string;
  status: 'active' | 'disabled';
}

interface Publisher {
  id: string;
  name: string;
  slug: string;
}

export function UsersPage() {
  const { token, user: currentUser, impersonateUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const [createDialog, setCreateDialog] = useState({
    isOpen: false,
    isLoading: false,
    error: null as string | null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    user: User | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    user: null,
    isDeleting: false,
  });

  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    user: User | null;
  }>({
    isOpen: false,
    isLoading: false,
    error: null,
    user: null,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublishers = async () => {
    try {
      const response = await fetch('/api/publishers?limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPublishers(data.publishers);
      }
    } catch (err) {
      console.error('Failed to fetch publishers:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPublishers();
  }, [token]);

  const handleCreateClick = () => {
    setCreateDialog({
      isOpen: true,
      isLoading: false,
      error: null,
    });
  };

  const handleCreateCancel = () => {
    setCreateDialog({
      isOpen: false,
      isLoading: false,
      error: null,
    });
  };

  const handleCreateSubmit = async (formData: CreateUserForm) => {
    setCreateDialog((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          publisherId: formData.publisherId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      await fetchUsers();
      handleCreateCancel();
    } catch (err) {
      setCreateDialog((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create user',
      }));
    }
  };

  const handleDeleteClick = (user: User) => {
    setDeleteDialog({
      isOpen: true,
      user,
      isDeleting: false,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      user: null,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/users/${deleteDialog.user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.user?.id));
      handleDeleteCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleEditClick = (user: User) => {
    setEditDialog({
      isOpen: true,
      isLoading: false,
      error: null,
      user,
    });
  };

  const handleEditCancel = () => {
    setEditDialog({
      isOpen: false,
      isLoading: false,
      error: null,
      user: null,
    });
  };

  const handleEditSubmit = async (formData: EditUserForm) => {
    if (!editDialog.user) return;

    setEditDialog((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/users/${editDialog.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          publisherId: formData.role === 'publisher' ? formData.publisherId : null,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      await fetchUsers();
      handleEditCancel();
    } catch (err) {
      setEditDialog((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to update user',
      }));
    }
  };

  const handleImpersonate = async (user: User) => {
    setImpersonating(user.id);
    setError(null);
    try {
      const success = await impersonateUser(user.id);
      if (success) {
        if (user.role === 'publisher') {
          window.location.href = '/publisher/dashboard';
        } else {
          window.location.href = '/admin/dashboard';
        }
      } else {
        setError('Failed to start impersonation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setImpersonating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage admin and publisher user accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateClick}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Add User
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  currentUserRole={currentUser?.role}
                  impersonating={impersonating}
                  onImpersonate={handleImpersonate}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal
        isOpen={createDialog.isOpen}
        isLoading={createDialog.isLoading}
        error={createDialog.error}
        publishers={publishers}
        onSubmit={handleCreateSubmit}
        onCancel={handleCreateCancel}
      />

      <EditUserModal
        isOpen={editDialog.isOpen}
        isLoading={editDialog.isLoading}
        error={editDialog.error}
        user={editDialog.user}
        publishers={publishers}
        onSubmit={handleEditSubmit}
        onCancel={handleEditCancel}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteDialog.user?.name}"? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteDialog.isDeleting}
      />
    </div>
  );
}
