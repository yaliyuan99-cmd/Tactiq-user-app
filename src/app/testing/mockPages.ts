/**
 * Import this first in a test file to replace every lazily loaded feature
 * page with a stub (see pageStubs.tsx). The pages are only imported
 * dynamically when a route renders, after these mocks are registered.
 */
import { vi } from 'vitest';

vi.mock('@/features/auth/SignInPage', async () => (await import('./pageStubs')).stubPage('Sign in'));
vi.mock('@/features/auth/SignUpPage', async () => (await import('./pageStubs')).stubPage('Create a profile'));
vi.mock('@/features/auth/ForgotPasswordPage', async () => (await import('./pageStubs')).stubPage('Forgot password'));
vi.mock('@/features/auth/ResetPasswordPage', async () => (await import('./pageStubs')).stubPage('Choose a new password'));
vi.mock('@/features/onboarding/OnboardingPage', async () => (await import('./pageStubs')).stubPage('Welcome to Tactiq'));
vi.mock('@/features/dashboard/DashboardPage', async () => (await import('./pageStubs')).stubPage('Overview'));
vi.mock('@/features/connect/ConnectPage', async () => (await import('./pageStubs')).stubPage('Connect'));
vi.mock('@/features/calibrate/CalibratePage', async () => (await import('./pageStubs')).stubPage('Calibrate'));
vi.mock('@/features/train/TrainPage', async () => (await import('./pageStubs')).stubPage('Train'));
vi.mock('@/features/train/LessonPage', async () => (await import('./pageStubs')).stubPage('Lesson'));
vi.mock('@/features/simulator/SimulatorPage', async () => (await import('./pageStubs')).stubPage('Simulator'));
vi.mock('@/features/commands/CommandsPage', async () => (await import('./pageStubs')).stubPage('Commands'));
vi.mock('@/features/history/HistoryPage', async () => (await import('./pageStubs')).stubPage('History'));
vi.mock('@/features/settings/SettingsPage', async () => (await import('./pageStubs')).stubPage('Settings'));
vi.mock('@/features/help/HelpPage', async () => (await import('./pageStubs')).stubPage('Help'));
