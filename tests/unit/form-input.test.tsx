import { render, screen } from '@testing-library/react'
import FormInput from '../../src/components/shared/FormInput'
import userEvent from '@testing-library/user-event'

describe('FormInput Component', () => {
  const defaultProps = {
    name: 'test',
    value: '',
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders input with label', () => {
    render(<FormInput {...defaultProps} label="שם מלא" />)
    
    expect(screen.getByLabelText(/שם מלא/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('calls onChange handler when user types', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <FormInput 
        {...defaultProps}
        label="שם" 
        onChange={handleChange}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'ישראל')
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies required attribute when required prop is true', () => {
    render(<FormInput {...defaultProps} label="אימייל" required />)
    
    expect(screen.getByRole('textbox')).toBeRequired()
  })

  it('renders with placeholder text', () => {
    render(
      <FormInput 
        {...defaultProps}
        label="טלפון" 
        placeholder="050-1234567" 
      />
    )
    
    expect(screen.getByPlaceholderText('050-1234567')).toBeInTheDocument()
  })

  it('renders as textarea when type is textarea', () => {
    render(
      <FormInput
        {...defaultProps}
        label="הערות"
        type="textarea"
      />
    )
    
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })
})
