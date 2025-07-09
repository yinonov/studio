import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getClientAuth: jest.fn(),
  getClientDb: jest.fn(),
  getClientFunctions: jest.fn(),
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  FileText: () => 'FileText',
  Home: () => 'Home',
  Building: () => 'Building',
  Handshake: () => 'Handshake',
  ShieldCheck: () => 'ShieldCheck',
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  PlusCircle: () => 'PlusCircle',
  Loader2: () => 'Loader2',
  PanelLeft: () => 'PanelLeft',
}))

// Setup console error suppression for tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
