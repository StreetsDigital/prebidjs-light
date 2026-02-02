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

interface UserTableRowProps {
  user: User;
  currentUserRole?: string;
  impersonating: string | null;
  onImpersonate: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UserTableRow({
  user,
  currentUserRole,
  impersonating,
  onImpersonate,
  onEdit,
  onDelete,
}: UserTableRowProps) {
  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      publisher: 'bg-green-100 text-green-800',
    };
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      publisher: 'Publisher',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      disabled: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getRoleBadge(user.role)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(user.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
        {currentUserRole === 'super_admin' && user.role !== 'super_admin' && (
          <button
            type="button"
            onClick={() => onImpersonate(user)}
            disabled={impersonating === user.id}
            className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {impersonating === user.id ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Impersonating...
              </span>
            ) : (
              'Impersonate'
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="text-blue-600 hover:text-blue-900"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(user)}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
