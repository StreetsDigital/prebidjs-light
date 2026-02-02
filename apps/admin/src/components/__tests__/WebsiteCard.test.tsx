import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebsiteCard } from '../WebsiteCard';

describe('WebsiteCard', () => {
  const mockWebsite = {
    id: 'website-1',
    name: 'Test Website',
    domain: 'example.com',
    status: 'active' as const,
    notes: 'Test notes',
    configs: [],
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddConfig: vi.fn(),
    onEditConfig: vi.fn(),
    onDeleteConfig: vi.fn(),
  };

  beforeEach(() => {
    Object.values(mockHandlers).forEach(fn => fn.mockClear());
    window.confirm = vi.fn(() => true);
  });

  describe('Basic rendering', () => {
    it('should render website name and domain', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      expect(screen.getByText('Test Website')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should display website status badge', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('should show config count', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      expect(screen.getByText('0 configs')).toBeInTheDocument();
    });

    it('should show singular form for one config', () => {
      const websiteWithConfig = {
        ...mockWebsite,
        configs: [
          {
            id: 'config-1',
            name: 'Test Config',
            status: 'active' as const,
          },
        ],
      };

      render(<WebsiteCard website={websiteWithConfig} {...mockHandlers} />);

      expect(screen.getByText('1 config')).toBeInTheDocument();
    });
  });

  describe('Status colors', () => {
    it('should apply green color for active status', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      const badge = screen.getByText('ACTIVE');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should apply yellow color for paused status', () => {
      const pausedWebsite = { ...mockWebsite, status: 'paused' as const };
      render(<WebsiteCard website={pausedWebsite} {...mockHandlers} />);

      const badge = screen.getByText('PAUSED');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should apply red color for disabled status', () => {
      const disabledWebsite = { ...mockWebsite, status: 'disabled' as const };
      render(<WebsiteCard website={disabledWebsite} {...mockHandlers} />);

      const badge = screen.getByText('DISABLED');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Action buttons', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      const editButton = screen.getByTitle('Edit Website');
      await user.click(editButton);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockWebsite);
    });

    it('should call onDelete with confirmation when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      const deleteButton = screen.getByTitle('Delete Website');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('website-1');
    });

    it('should not delete if confirmation is cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);

      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      const deleteButton = screen.getByTitle('Delete Website');
      await user.click(deleteButton);

      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    });

    it('should call onAddConfig when Add Config button is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      const addButton = screen.getByText('Add Config');
      await user.click(addButton);

      expect(mockHandlers.onAddConfig).toHaveBeenCalledWith('website-1');
    });
  });

  describe('Expand/collapse functionality', () => {
    const websiteWithConfigs = {
      ...mockWebsite,
      configs: [
        {
          id: 'config-1',
          name: 'Config 1',
          description: 'Test config',
          status: 'active' as const,
        },
      ],
    };

    it('should not show expand button when no configs', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      expect(screen.queryByTitle('Expand')).not.toBeInTheDocument();
    });

    it('should show expand button when configs exist', () => {
      render(<WebsiteCard website={websiteWithConfigs} {...mockHandlers} />);

      expect(screen.getByTitle('Expand')).toBeInTheDocument();
    });

    it('should expand and show configs when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithConfigs} {...mockHandlers} />);

      const expandButton = screen.getByTitle('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Configurations')).toBeInTheDocument();
      expect(screen.getByText('Config 1')).toBeInTheDocument();
    });

    it('should collapse when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithConfigs} {...mockHandlers} />);

      // Expand first
      await user.click(screen.getByTitle('Expand'));
      expect(screen.getByText('Configurations')).toBeInTheDocument();

      // Then collapse
      await user.click(screen.getByTitle('Collapse'));
      expect(screen.queryByText('Configurations')).not.toBeInTheDocument();
    });
  });

  describe('Global config indicator', () => {
    it('should show global config indicator when global config exists', () => {
      const websiteWithGlobal = {
        ...mockWebsite,
        configs: [
          {
            id: 'config-1',
            name: 'Global Config',
            status: 'active' as const,
            isDefault: true,
          },
        ],
      };

      render(<WebsiteCard website={websiteWithGlobal} {...mockHandlers} />);

      expect(screen.getByText('✓ Has global config')).toBeInTheDocument();
    });

    it('should not show global indicator when no global config', () => {
      render(<WebsiteCard website={mockWebsite} {...mockHandlers} />);

      expect(screen.queryByText('✓ Has global config')).not.toBeInTheDocument();
    });
  });

  describe('Config display', () => {
    const websiteWithMultipleConfigs = {
      ...mockWebsite,
      configs: [
        {
          id: 'config-global',
          name: 'Global Config',
          description: 'Default config',
          status: 'active' as const,
          isDefault: true,
        },
        {
          id: 'config-targeted',
          name: 'Targeted Config',
          description: 'With rules',
          status: 'active' as const,
          rules: [
            {
              id: 'rule-1',
              conditions: '[{"attribute":"country","operator":"equals","value":"US"}]',
              matchType: 'all' as const,
              priority: 1,
              enabled: true,
            },
          ],
        },
        {
          id: 'config-blocking',
          name: 'Blocking Config',
          status: 'active' as const,
          blockWrapper: true,
        },
      ],
    };

    it('should display global config with GLOBAL label', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithMultipleConfigs} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      expect(screen.getByText('GLOBAL')).toBeInTheDocument();
    });

    it('should display targeted config with TARGETED label', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithMultipleConfigs} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      expect(screen.getByText('TARGETED')).toBeInTheDocument();
    });

    it('should display blocking config with BLOCKING label', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithMultipleConfigs} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      expect(screen.getByText('BLOCKING')).toBeInTheDocument();
    });

    it('should show blocking warning', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithMultipleConfigs} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      expect(
        screen.getByText(/Wrapper will NOT initialize when this config matches/)
      ).toBeInTheDocument();
    });

    it('should display targeting rule details', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithMultipleConfigs} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      expect(screen.getByText('Priority 1:')).toBeInTheDocument();
      expect(screen.getByText('country')).toBeInTheDocument();
    });
  });

  describe('Config actions', () => {
    const websiteWithConfig = {
      ...mockWebsite,
      configs: [
        {
          id: 'config-1',
          name: 'Test Config',
          status: 'active' as const,
        },
      ],
    };

    it('should call onEditConfig when config edit is clicked', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithConfig} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      const editButtons = screen.getAllByText('Edit');
      // Last Edit button is for the config (first one is for website)
      await user.click(editButtons[editButtons.length - 1]);

      expect(mockHandlers.onEditConfig).toHaveBeenCalledWith(
        websiteWithConfig.configs[0]
      );
    });

    it('should call onDeleteConfig when config delete is confirmed', async () => {
      const user = userEvent.setup();
      render(<WebsiteCard website={websiteWithConfig} {...mockHandlers} />);

      await user.click(screen.getByTitle('Expand'));

      const deleteButtons = screen.getAllByText('Delete');
      // Last Delete button is for the config (first one is for website)
      await user.click(deleteButtons[deleteButtons.length - 1]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockHandlers.onDeleteConfig).toHaveBeenCalledWith('config-1');
    });
  });

  describe('Empty state', () => {
    it('should show empty state message when expanded with no configs', async () => {
      const user = userEvent.setup();
      const emptyWebsite = { ...mockWebsite, configs: [] };

      // Initially render with a config to show expand button
      const { rerender } = render(
        <WebsiteCard
          website={{
            ...emptyWebsite,
            configs: [{ id: 'temp', name: 'Temp', status: 'active' as const }],
          }}
          {...mockHandlers}
        />
      );

      // Expand
      await user.click(screen.getByTitle('Expand'));

      // Then update to no configs
      rerender(<WebsiteCard website={emptyWebsite} {...mockHandlers} />);

      expect(screen.getByText('No configurations yet')).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should apply hover effect classes', () => {
      const { container } = render(
        <WebsiteCard website={mockWebsite} {...mockHandlers} />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-md', 'transition');
    });

    it('should have proper border and shadow', () => {
      const { container } = render(
        <WebsiteCard website={mockWebsite} {...mockHandlers} />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('border', 'border-gray-200', 'shadow-sm');
    });
  });
});
