import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { PrivateRoute } from './PrivateRoute'
import { PermissionGuard } from './PermissionGuard'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // ---- Users ----
      {
        path: 'users',
        element: <PermissionGuard permission="users:read" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/users/pages/UsersPage').then((m) => ({
                Component: m.UsersPage,
              })),
          },
        ],
      },
      // ---- Roles ----
      {
        path: 'roles',
        element: <PermissionGuard permission="users:manage" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/users/pages/RolesPage').then((m) => ({
                Component: m.RolesPage,
              })),
          },
        ],
      },
      // ---- Academic Config ----
      {
        path: 'academic',
        element: <PermissionGuard permission="academic_config:manage" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/academic/pages/AcademicPage').then((m) => ({
                Component: m.AcademicPage,
              })),
          },
          {
            path: 'levels',
            lazy: () =>
              import('@/features/academic/pages/LevelsPage').then((m) => ({
                Component: m.LevelsPage,
              })),
          },
          {
            path: 'subjects',
            lazy: () =>
              import('@/features/academic/pages/SubjectsPage').then((m) => ({
                Component: m.SubjectsPage,
              })),
          },
          {
            path: 'years',
            lazy: () =>
              import('@/features/academic/pages/AcademicYearsPage').then((m) => ({
                Component: m.AcademicYearsPage,
              })),
          },
          {
            path: 'parallels',
            lazy: () =>
              import('@/features/academic/pages/ParallelsPage').then((m) => ({
                Component: m.ParallelsPage,
              })),
          },
          {
            path: 'assignments',
            lazy: () =>
              import('@/features/academic/pages/CourseAssignmentsPage').then((m) => ({
                Component: m.CourseAssignmentsPage,
              })),
          },
          {
            path: 'insumo-setup',
            lazy: () =>
              import('@/features/academic/pages/ParallelInsumoSetupPage').then((m) => ({
                Component: m.ParallelInsumoSetupPage,
              })),
          },
        ],
      },
      // ---- Activities ----
      {
        path: 'activities',
        element: <PermissionGuard permission="activities:write" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/activities/pages/ActivitiesPage').then((m) => ({
                Component: m.ActivitiesPage,
              })),
          },
        ],
      },
      // ---- Grades ----
      {
        path: 'grades',
        element: <PermissionGuard permission="grades:read" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/grades/pages/GradeEntryPage').then((m) => ({
                Component: m.GradeEntryPage,
              })),
          },
        ],
      },
      // ---- Enrollment ----
      {
        path: 'enrollment',
        element: <PermissionGuard permission="academic_config:manage" />,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/enrollment/pages/EnrollmentPage').then((m) => ({
                Component: m.EnrollmentPage,
              })),
          },
        ],
      },
      // ---- Attendance ----
      {
        path: 'attendance',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/attendance/pages/AttendancePage').then((m) => ({
                Component: m.AttendancePage,
              })),
          },
        ],
      },
      {
        path: 'attendance/justifications',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/attendance/pages/JustificationsPage').then((m) => ({
                Component: m.JustificationsPage,
              })),
          },
        ],
      },
      // ---- Reports ----
      {
        path: 'reports',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/reports/pages/ReportsPage').then((m) => ({
                Component: m.ReportsPage,
              })),
          },
        ],
      },
      // ---- Incidents ----
      {
        path: 'incidents',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/incidents/pages/IncidentsPage').then((m) => ({
                Component: m.IncidentsPage,
              })),
          },
        ],
      },
      // ---- Schedules ----
      {
        path: 'schedules',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/schedules/pages/SchedulePage').then((m) => ({
                Component: m.SchedulePage,
              })),
          },
        ],
      },
      // ---- Messaging ----
      {
        path: 'messages',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/messaging/pages/MessagingPage').then((m) => ({
                Component: m.MessagingPage,
              })),
          },
        ],
      },
      // ---- Tasks ----
      {
        path: 'tasks',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/tasks/pages/TasksPage').then((m) => ({
                Component: m.TasksPage,
              })),
          },
        ],
      },
      // ---- Calendar ----
      {
        path: 'calendar',
        children: [
          {
            index: true,
            lazy: () =>
              import('@/features/calendar/pages/CalendarPage').then((m) => ({
                Component: m.CalendarPage,
              })),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
