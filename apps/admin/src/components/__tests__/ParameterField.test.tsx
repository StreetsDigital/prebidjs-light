import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParameterField from '../ParameterField';

describe('ParameterField', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  describe('String fields', () => {
    const stringParameter = {
      name: 'apiKey',
      type: 'string' as const,
      required: true,
      description: 'Your API key',
    };

    it('should render string input field', () => {
      render(
        <ParameterField
          parameter={stringParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show required indicator', () => {
      render(
        <ParameterField
          parameter={stringParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should update value on change', async () => {
      const user = userEvent.setup();

      render(
        <ParameterField
          parameter={stringParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'test-value');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should display placeholder from default value', () => {
      render(
        <ParameterField
          parameter={{ ...stringParameter, defaultValue: 'default-key' }}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'default-key');
    });
  });

  describe('Number fields', () => {
    const numberParameter = {
      name: 'timeout',
      type: 'number' as const,
      required: false,
      description: 'Timeout in milliseconds',
      validation: { min: 0, max: 5000 },
    };

    it('should render number input field', () => {
      render(
        <ParameterField
          parameter={numberParameter}
          value={null}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should respect min/max validation', () => {
      render(
        <ParameterField
          parameter={numberParameter}
          value={100}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '5000');
    });

    it('should convert string to number on change', async () => {
      const user = userEvent.setup();

      render(
        <ParameterField
          parameter={numberParameter}
          value={null}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      // Use paste to avoid multiple onChange calls from typing
      await user.click(input);
      await user.paste('123');

      expect(mockOnChange).toHaveBeenCalledWith(123);
    });
  });

  describe('Boolean fields', () => {
    const booleanParameter = {
      name: 'enabled',
      type: 'boolean' as const,
      required: false,
      description: 'Enable this feature',
    };

    it('should render checkbox for boolean', () => {
      render(
        <ParameterField
          parameter={booleanParameter}
          value={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should toggle value on click', async () => {
      const user = userEvent.setup();

      render(
        <ParameterField
          parameter={booleanParameter}
          value={false}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should show checked state', () => {
      render(
        <ParameterField
          parameter={booleanParameter}
          value={true}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Enum fields', () => {
    const enumParameter = {
      name: 'environment',
      type: 'string' as const,
      required: true,
      description: 'Environment setting',
      validation: { enum: ['production', 'staging', 'development'] },
    };

    it('should render select for enum', () => {
      render(
        <ParameterField
          parameter={enumParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show all enum options', () => {
      render(
        <ParameterField
          parameter={enumParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('option', { name: 'production' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'staging' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'development' })).toBeInTheDocument();
    });

    it('should update value on selection', async () => {
      const user = userEvent.setup();

      render(
        <ParameterField
          parameter={enumParameter}
          value=""
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'production');

      expect(mockOnChange).toHaveBeenCalledWith('production');
    });
  });

  describe('Object/Array fields', () => {
    const objectParameter = {
      name: 'config',
      type: 'object' as const,
      required: false,
      description: 'Configuration object',
    };

    it('should render textarea for objects', () => {
      render(
        <ParameterField
          parameter={objectParameter}
          value={null}
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should display JSON formatted value', () => {
      const value = { key: 'value', nested: { prop: 123 } };

      render(
        <ParameterField
          parameter={objectParameter}
          value={value}
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toContain('"key": "value"');
    });

    it('should parse JSON on change', async () => {
      const user = userEvent.setup();

      render(
        <ParameterField
          parameter={objectParameter}
          value={null}
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');

      // Use paste instead of type for complex JSON strings
      await user.click(textarea);
      await user.paste('{"test": "value"}');

      expect(mockOnChange).toHaveBeenCalledWith({ test: 'value' });
    });
  });

  describe('Error handling', () => {
    const parameter = {
      name: 'test',
      type: 'string' as const,
      required: true,
      description: 'Test field',
    };

    it('should display error message', () => {
      render(
        <ParameterField
          parameter={parameter}
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(
        <ParameterField
          parameter={parameter}
          value=""
          onChange={mockOnChange}
          error="Error"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('should show helper text when no error', () => {
      render(
        <ParameterField
          parameter={{ ...parameter, defaultValue: 'default' }}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Default:/)).toBeInTheDocument();
    });

    it('should not show helper text when error exists', () => {
      render(
        <ParameterField
          parameter={{ ...parameter, defaultValue: 'default' }}
          value=""
          onChange={mockOnChange}
          error="Error message"
        />
      );

      expect(screen.queryByText(/Default:/)).not.toBeInTheDocument();
    });
  });

  describe('Validation hints', () => {
    it('should show min/max hints in tooltip', () => {
      const parameter = {
        name: 'count',
        type: 'number' as const,
        required: true,
        description: 'Item count',
        validation: { min: 1, max: 100 },
      };

      render(
        <ParameterField
          parameter={parameter}
          value={10}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Item count')).toBeInTheDocument();
    });

    it('should show pattern hint', () => {
      const parameter = {
        name: 'code',
        type: 'string' as const,
        required: true,
        description: 'Code pattern',
        validation: { pattern: '^[A-Z]{3}$' },
      };

      render(
        <ParameterField
          parameter={parameter}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '^[A-Z]{3}$');
    });
  });

  describe('Accessibility', () => {
    const parameter = {
      name: 'username',
      type: 'string' as const,
      required: true,
      description: 'Your username',
    };

    it('should have accessible label', () => {
      render(
        <ParameterField
          parameter={parameter}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('username')).toBeInTheDocument();
    });

    it('should have info icon with description', () => {
      render(
        <ParameterField
          parameter={parameter}
          value=""
          onChange={mockOnChange}
        />
      );

      // Info icon should be present (lucide-react Info component)
      const infoIcon = document.querySelector('svg');
      expect(infoIcon).toBeInTheDocument();
    });
  });
});
