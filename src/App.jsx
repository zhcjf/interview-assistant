import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Jobs from './pages/Jobs.jsx'
import Interviews from './pages/Interviews.jsx'
import InterviewDetail from './pages/InterviewDetail.jsx'
import Preparation from './pages/Preparation.jsx'
import ReviewList from './pages/ReviewList.jsx'
import ReviewForm from './pages/ReviewForm.jsx'
import ReviewDetail from './pages/ReviewDetail.jsx'
import Settings from './pages/Settings.jsx'
import { ToastProvider } from './components/Toast.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/interviews/:id" element={<InterviewDetail />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/reviews" element={<ReviewList />} />
          <Route path="/reviews/new/:interviewId" element={<ReviewForm />} />
          <Route path="/reviews/edit/:id" element={<ReviewForm />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
