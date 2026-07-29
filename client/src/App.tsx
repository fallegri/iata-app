import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseCreate from './pages/CourseCreate';
import CourseDetail from './pages/CourseDetail';
import CourseEdit from './pages/CourseEdit';
import AIAssistant from './pages/AIAssistant';
import AIConfig from './pages/AIConfig';
import Institution from './pages/Institution';
import StudentForm from './pages/StudentForm';
import StudentSuccess from './pages/StudentSuccess';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/declare/:code" element={<StudentForm />} />
          <Route path="/declare/:code/success" element={<StudentSuccess />} />

          {/* Protected routes — require authentication */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path="/courses/new" element={<ProtectedRoute><CourseCreate /></ProtectedRoute>} />
          <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/courses/:id/edit" element={<ProtectedRoute><CourseEdit /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
          <Route path="/ai/config" element={<ProtectedRoute><AIConfig /></ProtectedRoute>} />
          <Route path="/institution" element={<ProtectedRoute><Institution /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
