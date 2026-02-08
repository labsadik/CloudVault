import { useAuth } from '@/hooks/useAuth';
import AuthPage from './AuthPage';
import DrivePage from './DrivePage';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <DrivePage /> : <AuthPage />;
};

export default Index;
