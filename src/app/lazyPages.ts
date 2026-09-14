/** One code-split chunk per page. Each module's default export is the page. */
import { lazy } from 'react';

export const SignInPage = lazy(() => import('@/features/auth/SignInPage'));
export const SignUpPage = lazy(() => import('@/features/auth/SignUpPage'));
export const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
export const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
export const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
export const ConnectPage = lazy(() => import('@/features/connect/ConnectPage'));
export const CalibratePage = lazy(() => import('@/features/calibrate/CalibratePage'));
export const TrainPage = lazy(() => import('@/features/train/TrainPage'));
export const LessonPage = lazy(() => import('@/features/train/LessonPage'));
export const SimulatorPage = lazy(() => import('@/features/simulator/SimulatorPage'));
export const CommandsPage = lazy(() => import('@/features/commands/CommandsPage'));
export const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
export const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
export const HelpPage = lazy(() => import('@/features/help/HelpPage'));
export const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
