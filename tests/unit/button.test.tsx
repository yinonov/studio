import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import userEvent from '@testing-library/user-event';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Test Button</Button>);

    expect(
      screen.getByRole('button', { name: 'Test Button' })
    ).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    const { container } = render(<Button variant='destructive'>Delete</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('is disabled when disabled prop is true', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different sizes', () => {
    const { container } = render(<Button size='sm'>Small Button</Button>);

    const button = container.querySelector('button');
    expect(button).toHaveClass('h-9');
  });
});
