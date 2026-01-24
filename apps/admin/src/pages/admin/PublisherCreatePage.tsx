import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface FieldErrors {
  name?: string;
  slug?: string;
  domains?: string;
}

export function PublisherCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: '',
    slug: '',
    domains: '',
    notes: '',
  });

  // Domain validation regex - allows standard domains and wildcards (*.example.com)
  const domainPattern = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  const validateDomain = (domain: string): boolean => {
    const trimmed = domain.trim();
    if (!trimmed) return true; // Empty is ok (will be filtered out)
    return domainPattern.test(trimmed);
  };

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'Publisher name is required';
        }
        if (value.trim().length < 2) {
          return 'Publisher name must be at least 2 characters';
        }
        break;
      case 'slug':
        if (!value.trim()) {
          return 'Slug is required';
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Slug can only contain lowercase letters, numbers, and hyphens';
        }
        break;
      case 'domains':
        if (value.trim()) {
          const domains = value.split(',').map(d => d.trim()).filter(d => d.length > 0);
          const invalidDomains = domains.filter(d => !validateDomain(d));
          if (invalidDomains.length > 0) {
            return `Invalid domain format: "${invalidDomains[0]}". Use format like "example.com" or "*.example.com" for wildcards.`;
          }
        }
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const nameError = validateField('name', form.name);
    const slugError = validateField('slug', form.slug);
    const domainsError = validateField('domains', form.domains);

    if (nameError) errors.name = nameError;
    if (slugError) errors.slug = slugError;
    if (domainsError) errors.domains = domainsError;

    setFieldErrors(errors);
    setTouched({ name: true, slug: true, domains: true });

    return Object.keys(errors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field as keyof typeof form]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const domainsArray = form.domains
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const response = await fetch('/api/publishers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          domains: domainsArray,
          notes: form.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create publisher');
      }

      const newPublisher = await response.json();
      navigate(`/admin/publishers/${newPublisher.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create publisher');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/publishers');
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/admin/publishers"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Publisher</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new publisher to the platform.
          </p>
        </div>
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

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Publisher Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  aria-invalid={touched.name && !!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 sm:text-sm ${
                    touched.name && fieldErrors.name
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Acme Publishing"
                />
                {touched.name && fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600" id="name-error">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  Slug *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, slug: e.target.value }));
                    if (touched.slug) {
                      const error = validateField('slug', e.target.value);
                      setFieldErrors((prev) => ({ ...prev, slug: error }));
                    }
                  }}
                  onBlur={() => handleBlur('slug')}
                  aria-invalid={touched.slug && !!fieldErrors.slug}
                  aria-describedby={fieldErrors.slug ? 'slug-error' : 'slug-description'}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 sm:text-sm ${
                    touched.slug && fieldErrors.slug
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="acme-publishing"
                />
                {touched.slug && fieldErrors.slug ? (
                  <p className="mt-1 text-sm text-red-600" id="slug-error">
                    {fieldErrors.slug}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500" id="slug-description">
                    Unique identifier for the publisher. Auto-generated from name.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="domains" className="block text-sm font-medium text-gray-700">
                  Allowed Domains
                </label>
                <input
                  type="text"
                  id="domains"
                  name="domains"
                  value={form.domains}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, domains: e.target.value }));
                    if (touched.domains) {
                      const error = validateField('domains', e.target.value);
                      setFieldErrors((prev) => ({ ...prev, domains: error }));
                    }
                  }}
                  onBlur={() => handleBlur('domains')}
                  aria-invalid={touched.domains && !!fieldErrors.domains}
                  aria-describedby={fieldErrors.domains ? 'domains-error' : 'domains-description'}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 sm:text-sm ${
                    touched.domains && fieldErrors.domains
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="example.com, www.example.com"
                />
                {touched.domains && fieldErrors.domains ? (
                  <p className="mt-1 text-sm text-red-600" id="domains-error">
                    {fieldErrors.domains}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500" id="domains-description">
                    Comma-separated list of domains. Supports wildcards like *.example.com
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Internal notes about this publisher..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              Create Publisher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
